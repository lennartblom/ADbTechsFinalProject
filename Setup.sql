-- PostGIS aktivieren
CREATE EXTENSION postgis;

------------------------- Tabellen -----------------------------

-- loeschen:
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS gps_data CASCADE;
DROP TABLE IF EXISTS encounters CASCADE;
DROP TABLE IF EXISTS intersection_gps_data CASCADE;

-- einfuegen: 

CREATE TABLE users(
	id serial PRIMARY KEY,
	created timestamp NOT NULL default current_timestamp,
	last_edited timestamp,
	lastname varchar,
	firstname varchar,
	birthdate date,
	username varchar NOT NULL,
	password varchar NOT NULL,
	email varchar NOT NULL
);

CREATE TABLE activities(
	id serial PRIMARY KEY,
	created timestamp NOT NULL default current_timestamp,
	last_edited timestamp,
	user_id int references users(id) ON DELETE CASCADE,
	distance real, -- in meters (decimal)
	duration interval,
	start_time timestamp,
	end_time timestamp,
	CONSTRAINT null_cons CHECK(user_id IS NOT NULL)
);

CREATE TABLE gps_data(
	id serial PRIMARY KEY,
	created timestamp NOT NULL default current_timestamp,
	last_edited timestamp,
	geo geography(POINTZ, 4326),
	date_time timestamp,
	is_Start boolean,
	is_End boolean,
	activity_id int references activities(id) ON DELETE CASCADE,
	CONSTRAINT null_cons CHECK(activity_id IS NOT NULL)
);

-- n:m-Beziehung zwischen Activities
CREATE TABLE encounters(
	id serial PRIMARY KEY,
	activity_1_id int references activities(id) ON DELETE CASCADE,
	activity_2_id int references activities(id) ON DELETE CASCADE,
	created timestamp NOT NULL default current_timestamp,
	last_edited timestamp,
	duration interval,
	intersection geography (linestring, 4326),
	date_time timestamp,
	distance float,
	CONSTRAINT null_cons1 CHECK(activity_1_id IS NOT NULL),
	CONSTRAINT null_cons2 CHECK(activity_2_id IS NOT NULL)
);

CREATE TABLE intersection_gps_data(
	id serial PRIMARY KEY,
	activity_1_id int references activities(id) ON DELETE CASCADE,
	activity_2_id int references activities(id) ON DELETE CASCADE,
	created timestamp NOT NULL default current_timestamp,
	last_edited timestamp,
	geo geography(POINT, 4326),
	date_time timestamp,
	CONSTRAINT null_cons1 CHECK(activity_1_id IS NOT NULL),
	CONSTRAINT null_cons2 CHECK(activity_2_id IS NOT NULL)
);


------------------------- Funktionen -----------------------------

----------------- neuen Benutzer anlegen ---------------------
CREATE OR REPLACE FUNCTION createNewUser(
    p_username varchar, p_password varchar, p_email varchar)
  RETURNS boolean AS
$$
DECLARE
BEGIN
    INSERT INTO users (username, password, email) 
    VALUES (p_username, p_password, p_email);
    --RAISE NOTICE 'CREATING USER: SUCCESSFULL!';
    RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
    -- Fehler abfangen
    RAISE NOTICE 'CREATING USER: FAILED!';
    RAISE NOTICE '%', SQLERRM;
    RETURN FALSE;
END
$$ LANGUAGE 'plpgsql';


--------------------- pruefen, ob Username schon vergeben ----------------------------

CREATE OR REPLACE FUNCTION usernameExists(p_username varchar)
  RETURNS boolean AS
$$
DECLARE
    count int;
BEGIN
    count := COUNT(*) FROM users WHERE username = p_username;
    IF count = 0 THEN
        --RAISE NOTICE 'USERNAME CHECK: USERNAME DOES NOT EXIST!';  
        RETURN FALSE;
    ELSE
        --RAISE NOTICE 'USERNAME CHECK: USERNAME DOES ALREADY EXIST!'; 
        RETURN TRUE;
    END IF;

EXCEPTION WHEN OTHERS THEN
    -- Fehler abfangen
    RAISE NOTICE 'USERNAME CHECK: FAILED!';
    RAISE NOTICE '%', SQLERRM;
    RETURN TRUE;
END
$$ LANGUAGE 'plpgsql';


---------------------------- login ---------------------------------

CREATE OR REPLACE FUNCTION login(p_username varchar, p_password)
  RETURNS boolean AS
$$
DECLARE
    count int;
BEGIN
    count := COUNT(*) FROM users WHERE username = p_username AND password = p_password;
    IF count = 0 THEN
        --RAISE NOTICE 'LOGIN: USERNAME / PASSWORD COMBITNATION IS WRONG!';  
        RETURN FALSE;
    ELSE
        --RAISE NOTICE 'LOGIN: SUCCESSFULL !'; 
        RETURN TRUE;
    END IF;

EXCEPTION WHEN OTHERS THEN
    -- Fehler abfangen
    RAISE NOTICE 'LOGIN: FAILED!';
    RAISE NOTICE '%', SQLERRM;
    RETURN TRUE;
END
$$ LANGUAGE 'plpgsql';



----------------------- gpx/xml-Datei in Variable laden --------------------------------

CREATE OR REPLACE FUNCTION getXMLDocument(p_filename varchar)
  RETURNS xml AS
$$
SELECT CAST(pg_read_file(E'gpxdir/' || p_filename) As xml);
$$
LANGUAGE SQL;

----------------- GPS-Daten fuer Aktivitaet hinzufuegen --------------------------------

CREATE OR REPLACE FUNCTION addGPSDataForActivity(p_filename varchar, p_activity int)
  RETURNS boolean AS
$$
DECLARE
	length int;
    xml_doc xml;
    xml_path varchar;
    namespace varchar[][];
    longitude real[];
    latitude real[];
    elevation real[];
    time timestamp[];
    point geometry;
    is_Start boolean;
    is_End boolean;
    trkpts xml[];
BEGIN
    -- Datei in Variable laden
	xml_doc := getXMLDocument(p_filename);
    xml_path := '/gpx:gpx/gpx:trk/gpx:trkseg/gpx:trkpt';
    namespace := ARRAY[ARRAY['gpx', 'http://www.topografix.com/GPX/1/1']];
	-- einzelne Trackpoints in Array auftrennen
    trkpts := xpath(xml_path, xml_doc, namespace);
    -- laenge fuer for-Schleife berechnen
    length := array_length(trkpts,1);
    FOR i in 1..length
    LOOP
        -- alle Attribute eines Trackpoints auslesen und zwischenspeichern
        longitude := xpath('/gpx:trkpt/@lon', trkpts[i],namespace);
        latitude := xpath('/gpx:trkpt/@lat', trkpts[i],namespace);
        elevation := xpath('/gpx:trkpt/gpx:ele/text()', trkpts[i],namespace);
        time := xpath('/gpx:trkpt/gpx:time/text()', trkpts[i],namespace);

        -- gucken, ob es Start oder Ende ist (erstes / letztes Element)
    	is_Start := false;
    	is_End := false;

        IF i = 1 THEN
            is_Start := true;
        END IF;
        IF i = length THEN
            is_End := true;
        END IF;
        
        -- 3D Punkt aus den Attributen erstellen
        point := ST_MakePoint(longitude[1],latitude[1],elevation[1]);
        -- neuen Datensatz in die DB schreiben
        INSERT INTO gps_data (geo, date_time, is_Start, is_End, activity_id) 
	    VALUES (point, time[1], is_Start, is_End, p_activity);
	    -- Bestaetigung ausgeben
	    --RAISE NOTICE 'ADDED: %', ST_AsText(point);
    END LOOP;
    --RAISE NOTICE '% ROWS ADDED',length;
    RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
    -- Fehler abfangen
    RAISE NOTICE 'CREATING GPS-DATA FAILED!';
    RAISE NOTICE '%', SQLERRM;
    RETURN FALSE;

END;
$$ LANGUAGE 'plpgsql';


----------------- neue Activity erstellen und direkt Daten uebergeben -------------------

CREATE OR REPLACE FUNCTION createNewActivityWithData(p_filename varchar, p_user_id int)
  RETURNS boolean AS
$$
DECLARE
    newActivityId int;
    gpsResult boolean;
    length float;
    time interval;
    new_start_time timestamp;
    new_end_time timestamp;
BEGIN
    -- neue Aktivitaet mit uebergebenem User erstellen
    INSERT INTO activities (user_id) VALUES (p_user_id);
    -- ID der neuen Aktivitaet holen
    newActivityId := lastval();
    --RAISE NOTICE 'START ADDING GPS-DATA FOR ID: %', newActivityId;
    -- die GPS-Daten aus der Datei auslesen und der Aktivitaet zuordnen
    SELECT addGPSDataForActivity(p_filename,newActivityId) INTO gpsResult;
    length := getLengthOfActivity(newActivityId);
    time := getDurationOfActivity(newActivityId);
    new_start_time := date_time FROM gps_data WHERE activity_id = newActivityId AND is_Start = TRUE; 
    new_end_time := date_time FROM gps_data WHERE activity_id = newActivityId AND is_End = TRUE; 

    UPDATE activities 
        SET distance = length,
         duration = time,
         start_time = new_start_time,
         end_time = new_end_time
        WHERE id = newActivityId;
    RAISE NOTICE 'ACTIVITY SUCCESSFULLY CREATED';

    RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
    -- Fehler abfangen
    RAISE NOTICE 'CREATING ACTIVITY FAILED!';
    RAISE NOTICE '%', SQLERRM;
    RETURN FALSE;

END;
$$ LANGUAGE 'plpgsql';

------------------- Laenge (Entfernung) einer Aktivitaet berechnen ----------------------

CREATE OR REPLACE FUNCTION getLengthOfActivity(p_activity_id int)
  RETURNS float AS
$$
DECLARE
    points geometry[];
    line geometry;
    length float;
BEGIN
    points := array(SELECT geo FROM gps_data WHERE activity_id = p_activity_id);
    line := ST_MakeLine(points);
    length := ST_Length(ST_Transform(line,25832));
    --RAISE NOTICE 'CALCULATING LENGTH SUCCESSFULL: % m!', length;

    RETURN length;

EXCEPTION WHEN OTHERS THEN
    -- Fehler abfangen
    RAISE NOTICE 'CALCULATING LENGTH FAILED!';
    RAISE NOTICE '%', SQLERRM;
    RETURN -1;

END;
$$ LANGUAGE 'plpgsql';



------------------- Laenge (Dauer) einer Aktivitaet berechnen ----------------------

CREATE OR REPLACE FUNCTION getDurationOfActivity(p_activity_id int)
  RETURNS interval AS
$$
DECLARE
    start timestamp;
    ending timestamp;
    duration interval;

BEGIN
    start := min(date_time) from gps_data where activity_id = p_activity_id;
    ending := max(date_time) from gps_data where activity_id = p_activity_id;
    duration := age(ending, start);
    --RAISE NOTICE 'CALCULATING DURATION SUCCESSFULL: %!', duration;

    RETURN duration;

EXCEPTION WHEN OTHERS THEN
    -- Fehler abfangen
    RAISE NOTICE 'CALCULATING DURATION FAILED!';
    RAISE NOTICE '%', SQLERRM;
    RETURN NULL;

END;
$$ LANGUAGE 'plpgsql';


------------------- Pruefen, ob 2 Aktivitaeten gleichzeitig sind ----------------------


CREATE OR REPLACE FUNCTION atSameTime(p_activity1_id int, p_activity2_id int)
  RETURNS boolean AS
$$
DECLARE
    start1 timestamp;
    start2 timestamp;
    end1 timestamp;
    end2 timestamp;
BEGIN
    start1 := date_time FROM gps_data WHERE activity_id = p_activity1_id AND is_Start = true;
    end1 := date_time FROM gps_data WHERE activity_id = p_activity1_id AND is_End = true;
    start2 := date_time FROM gps_data WHERE activity_id = p_activity2_id AND is_Start = true;
    end2 := date_time FROM gps_data WHERE activity_id = p_activity2_id AND is_End = true;

    IF (start1, end1) OVERLAPS (start2, end2)  THEN
        --RAISE NOTICE 'SAME TIME!';  
        RETURN TRUE;
    ELSE
        --RAISE NOTICE 'NOT SAME TIME!';
        RETURN FALSE;
    END IF;

    EXCEPTION WHEN OTHERS THEN
    -- Fehler abfangen
    RAISE NOTICE 'CALCULATING SameTime FAILED!';
    RAISE NOTICE '%', SQLERRM;
    RETURN FALSE;


END;
$$ LANGUAGE 'plpgsql';


--  Neue Daten zu intersection einfuegen, falls Punkte zur gleichen Zeit am gleichen Ort --

CREATE OR REPLACE FUNCTION insertIfSamePlaceSameTime(a_id1 int, a_id2 int, point1 geometry, point2 geometry)
  RETURNS boolean AS
$$
DECLARE
   time1 timestamp;
   time2 timestamp; 
   length1 int;
   length2 int;
   tolarance interval;
BEGIN

    time1 := gps_data.date_time
                from gps_data
                where gps_data.geo = point1
                and activity_id = a_id1;
    time2 := gps_data.date_time
                from gps_data
                where gps_data.geo = point2
                and activity_id = a_id2;

    tolarance := age(time1, time2);
    
    IF tolarance > '- 10 seconds'::interval AND tolarance < '10 seconds'::interval THEN

        INSERT INTO intersection_gps_data (geo, date_time, activity_1_id, activity_2_id) 
            VALUES (point1, time1, a_id1, a_id2);

        RETURN TRUE; 
    END IF;

    RETURN FALSE;

    EXCEPTION WHEN OTHERS THEN
    -- Fehler abfangen
    RAISE NOTICE 'CALCULATING samePlaceSameTime FAILED!';
    RAISE NOTICE '%', SQLERRM;
    RETURN FALSE;


END;
$$ LANGUAGE 'plpgsql';

----- Pruefen, ob sich 2 Aktivitaeten begegnen und ggf. neue Begegnung erstellen -----

CREATE OR REPLACE FUNCTION checkIfActivitiesEncounter(p_activity1_id int, p_activity2_id int)
  RETURNS void AS
$$
DECLARE
    points1 geometry[];
    points2 geometry[];

    multipoint1 geometry;
    multipoint2 geometry;

    line1 geometry;
    line2 geometry;
    closePoint1 geometry;
    closePoint2 geometry;
    m_intersection geometry;
    intersection2 geometry[];
    intersectionLine geometry;
    npoints int;
    point geometry;
    length float;

    inserted boolean;
    oneIntersectionExists boolean;

    start timestamp;
    ending timestamp;
    t_duration interval;
BEGIN
    -- 2 Aktivitaeten holen
    points1 := array(SELECT geo FROM gps_data WHERE activity_id = p_activity1_id order by date_time);
    line1 := ST_MakeLine(points1);
    multipoint1 := st_collect(points1);
    points2 := array(SELECT geo FROM gps_data WHERE activity_id = p_activity2_id order by date_time);
    line2 := ST_MakeLine(points2);
    multipoint2 := st_collect(points2);

    IF atSameTime(p_activity1_id, p_activity2_id) AND ST_Intersects(line1, line2) THEN

        RAISE NOTICE '% and % MIGHT INTERSECT!', p_activity1_id, p_activity2_id;  

        --INSERT INTO encounters (activity_1_id, activity_2_id) VALUES (p_activity1_id,p_activity2_id);

        -- Begegnungen berechnen
        oneIntersectionExists := false;
        m_intersection := ST_CollectionExtract(ST_Intersection(line1,line2),1);
        npoints = ST_NPoints(m_intersection);
        -- Punkte schreiben
        FOR i in 1..npoints
            LOOP
            point := ST_GeometryN(m_intersection,i);
            closePoint1 := ST_ClosestPoint(multipoint1,point);
            closePoint2 := ST_ClosestPoint(multipoint2,point);
            --RAISE NOTICE '%', ST_AsText(point);
            inserted := insertIfSamePlaceSameTime(p_activity1_id, p_activity2_id, closePoint1, closePoint2);        
            
            IF inserted THEN
                oneIntersectionExists := true;
            END IF;

        END LOOP;
        IF oneIntersectionExists THEN
            intersection2 := array(SELECT geo
                                    from intersection_gps_data
                                    where activity_1_id = p_activity1_id
                                    and activity_2_id = p_activity2_id
                                    order by date_time);

            intersectionLine := ST_MakeLine(intersection2);

            length := ST_Length(ST_Transform(intersectionLine,25832));

            start := min(date_time) from intersection_gps_data where activity_1_id = p_activity1_id and activity_2_id = p_activity2_id;
            ending := max(date_time) from intersection_gps_data where activity_1_id = p_activity1_id and activity_2_id = p_activity2_id;
            t_duration := age(ending, start);

            INSERT INTO ENCOUNTERS (activity_1_id, activity_2_id, duration, intersection, date_time, distance)
                VALUES (p_activity1_id, p_activity2_id, t_duration, intersectionLine, start, length);

            RAISE NOTICE 'ENCOUNTER CREATED';
        ELSE
            RAISE NOTICE 'NO ENCOUNTER CREATED!';
        END IF;
    ELSE
        RAISE NOTICE 'THEY DONT INTERSECT!'; 
    END IF;

    EXCEPTION WHEN OTHERS THEN
    -- Fehler abfangen
    RAISE NOTICE 'CALCULATING ENCOUNTERS FAILED!';
    RAISE NOTICE '%', SQLERRM;

END;
$$ LANGUAGE 'plpgsql';


---------------------- Select Encounters from Activity with id -----------------------

CREATE OR REPLACE FUNCTION encountersWithActivity(activityid int, userid int)
  RETURNS TABLE(
    distance float,
    duration interval,
    id1 int,
    id2 int, 
    username varchar,
    idofuser int) AS
$$
BEGIN

RETURN QUERY
    select distinct 
        encounters.distance, 
        encounters.duration, 
        encounters.activity_1_id, 
        encounters.activity_2_id, 
        users.username,
        users.id
    from 
        encounters, users, activities
    where 
        (encounters.activity_1_id=activityid OR 
        encounters.activity_2_id=activityid) AND 
        users.id = activities.user_id AND 
        (activities.id = encounters.activity_1_id OR 
        activities.id = encounters.activity_2_id) AND
        users.id != userid AND 
        activities.user_id != userid;

END
$$ LANGUAGE 'plpgsql';





-------------------- Alle Begegnungen nach einem neuen Insert berechnen -----------------

CREATE OR REPLACE FUNCTION encounterWithAllActivities()
    RETURNS trigger AS 
$$
DECLARE
    a_ids int[];
    length int;
BEGIN
    a_ids := array(SELECT id FROM activities);
    length := array_length(a_ids,1);
    FOR i in 1..length
        LOOP
            IF a_ids[i] != NEW.ID THEN
                PERFORM checkIfActivitiesEncounter(a_ids[i], NEW.ID);
            END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';




---------------------- Loeschen ---------------------------


CREATE OR REPLACE FUNCTION deleteActivity(a_id int)
  RETURNS void AS
$$
DELETE FROM activities where id = a_id;
$$
LANGUAGE SQL;


CREATE OR REPLACE FUNCTION deleteUser(u_id int)
  RETURNS void AS
$$
DELETE FROM users where id = u_id;
$$
LANGUAGE SQL;





---------------------- Trigger ---------------------------


CREATE TRIGGER checkEncounters
    AFTER UPDATE ON activities
    FOR EACH ROW
    EXECUTE PROCEDURE encounterWithAllActivities();
