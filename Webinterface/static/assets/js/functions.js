var globalMapVar;
var polylines = {};
var nodeJsURL = 'http://127.0.0.1:5433/';
var trackColours = [
  "#4183D7",
  "#26A65B",
  "#D35400",
  "#6C7A89",
  "#2C3E50",
  "#BF55EC",
];

$(document).ready(function() {
  var mapOptions = {
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  globalMapVar = new google.maps.Map(document.getElementById('map'), {
        zoom: 8,
        center: {lat: -34.397, lng: 150.644}
  });


  $('#upload_button').click(function() {
    $('#message_box').html('<div id="loader_placeholder" class="spinner"></div>');
    $('#message_box').append('<p class="text-center">Deine Tour wird hochgeladen und analysiert!</p>');
    
  });

/*
  $('#uploadForm').validate({
    alert("Test");
    submitHandler: function(form) {
        $.ajax({
            url: form.action,
            type: form.method,
            data: $(form).serialize(),
            success: function(response) {
                $('#answers').html(response);
            }            
        });
    }
  });*/

  /*$('form#uploadForm').submit(function () {
    $('input[type="file"]').each(function() {
      var $this = $(this);
      alert($this.val());
      if ($this.val() == '') { 
          alert('Upload file not selected!');
          $this.addClass('Error').fadeOut().fadeIn();
          return false;
      } else {
          $this.removeClass('Error');
      }
    });
  });*/

});

function loginFormCheck(){
  if(!$('#username_input').val()){
      alert("Username nicht ausgefüllt.");
      return false;
  }else if(!$('#pw_input').val()){
      alert("Passwort nicht ausgefüllt.");
      return false;
  }else{
    console.log("LoginFormCheck() ist durchgelaufen.");
    return true;
  }
}

function showMembers(){

  $.ajax({
      url: nodeJsURL+'members/showMembers/',
      // dataType: "jsonp",
      dataType: "json",
      type: 'POST',
      jsonpCallback: 'callback', // this is not relevant to the POST anymore
      success: function (data) {
          console.log("Success.");
          var length = data.length;
          var username = '';
          for(var i=0;i<length;i++){
            username = data[i]['username'];

            $("#memberlist").append("<li id=\""+ data[i]['id'] +"\"><a href=\"/mitglieder/profil/"+data[i]['id']+"/\"><span class=\"glyphicon glyphicon-user\"></span></a> " + username);
            getActivities(data[i]['id']);
          }

          console.log("Userdaten sind komplett.");
          //console.log(data);

      },
      error: function (xhr, status, error) {
          console.log("Error...");
      }
  });
}

function getActivities(userId){

  var jsonData = [];

  jsonData.push({
      action: "getActivities"
  });

  jsonData.push({
      userId: userId
  });

  $.ajax({
      url: nodeJsURL+'members/getActivities',
      // dataType: "jsonp",
      data: JSON.stringify(jsonData),
      dataType: "json",
      type: 'POST',
      jsonpCallback: 'callback', // this is not relevant to the POST anymore
      success: function (data) {
          //console.log("Aktivitäten vom User("+userId+"): ");

          //console.log(data);

          //console.log("Daten Ende. Anfang HTML-Manipulation.");

          $('#memberlist li#'+userId).append("<ul>");
          var length = data.length;

          for(var i=0;i<length;i++){
            $('#memberlist li#'+userId+' ul').append("<li><span class=\"glyphicon glyphicon-road\"></span> <strong>Radfahrt am: </strong> "+ $.format.date(data[i]['start_time'], "dd.MM.yyyy")  +" <strong>Distanz:</strong> "+ Math.round(data[i]['distance']/1000) + "km " + "<a href=\"/mitglieder/aktivitaet/"+data[i]['id']+"/\">+</a>");
          }
          $("#memberlist").append("</ul>");
          



          //console.log("Ende vom User("+userId+"): ");
      },
      error: function (xhr, status, error) {
          console.log("Error...");
          return 0;
      }
  });
}

function registerNewUserForm(){
  if(checkRegisterForm() == true){
    console.log("Form Check complete!");

    var password = $('#password_input').val();

    var securePassword = $.md5(password);

    var email = $('#email_input').val();
    var username = $('#username_input').val();

    console.log('Variablen deklariert...');

    addUserToDB(username, securePassword, email);
  }else{
    console.log("Form Check complete with errors");
  }
}

function loginTest(){
  if(loginFormCheck() == true){

      console.log("Login test.");
      var username = $('#username_input').val();
      var password = $('#pw_input').val();
      var securePassword = $.md5(password);
      var result = false;

      var jsonData = [];

      jsonData.push({
          action: "testLoginPwCombination"
      });

      jsonData.push({
        username: username,
        password: securePassword
      });

      $.ajax({
          url: nodeJsURL+'verifyLogin',
          // dataType: "jsonp",
          data: JSON.stringify(jsonData),
          dataType: "json",
          type: 'POST',
          jsonpCallback: 'callback', // this is not relevant to the POST anymore
          success: function (data) {
              
              console.log("#### Login-Check Sucess Beginning ####");

              if(data[0]['result']){
                  var jsonData2 = [];

                  jsonData2.push({
                    username: username,
                    password: securePassword
                  });

                  $.ajax({
                    url: nodeJsURL+'checkPassword',
                    // dataType: "jsonp",
                    data: JSON.stringify(jsonData),
                    dataType: "json",
                    type: 'POST',
                    jsonpCallback: 'callback', // this is not relevant to the POST anymore
                    success: function (data) {
                        console.log("#### Password-Check Beginning ####");

                        if(data[0]['result']){
                          console.log("Passwort stimmt auch."); 
                          $('#message_box').removeClass('bg-danger');
                          $('#message_box').addClass("bg-success");
                          $('#message_box').html("<p>Sehr gut, das war ein richtiger Login. <br>Möchtest du eine .gpx Datei <a class=\"btn btn-success\" href=\"/userGPXUpload\">hochladen</a>?<br></p>");
                          $('.form-group').hide();
                          result = true;
                        }else{
                          console.log("nä....");
                          $('#message_box').addClass("bg-danger");
                          $('#message_box').html("<p>Authentifizierung ist fehlgeschlagen. Prüfe deine Logindaten.</p>");
                        }

                        console.log("#### Password-Check End ####");
                    },
                    error: function (xhr, status, error) {
                        console.log('Error: ' + error.message);
                        $('#respond').html('Error connecting to the server.');
                    }
                  });
      


              }else{
                console.log("nä....");
                $('#message_box').addClass("bg-danger");
                $('#message_box').html("<p>Authentifizierung ist fehlgeschlagen. Prüfe deine Logindaten.</p>");
              }

              console.log("#### Login-Check Sucess End ####");
          },
          error: function (xhr, status, error) {
              console.log('Error: ' + error.message);
              $('#respond').html('Error connecting to the server.');
          }
      });

      

  }else{
      console.log("Formcheck nicht in Ordnung.");
  }
}


function authorize(){
  if(loginFormCheck() == true){

      console.log("Login test.");
      var username = $('#username_input').val();
      var password = $('#pw_input').val();
      var securePassword = $.md5(password);
      var result = false;

      var jsonData = [];

      jsonData.push({
          action: "testLoginPwCombination"
      });

      jsonData.push({
        username: username,
        password: securePassword
      });

      $.ajax({
          url: nodeJsURL+'verifyLogin',
          // dataType: "jsonp",
          data: JSON.stringify(jsonData),
          dataType: "json",
          type: 'POST',
          jsonpCallback: 'callback', // this is not relevant to the POST anymore
          success: function (data) {
              
              console.log("#### Login-Check Sucess Beginning ####");

              if(data[0]['result']){
                  var jsonData2 = [];

                  jsonData2.push({
                    username: username,
                    password: securePassword
                  });

                  $.ajax({
                    url: '/checkPassword',
                    // dataType: "jsonp",
                    data: JSON.stringify(jsonData),
                    dataType: "json",
                    type: 'POST',
                    jsonpCallback: 'callback', // this is not relevant to the POST anymore
                    success: function (data) {
                        console.log("#### Password-Check Beginning ####");
                        if(data[0]['result']){
                          console.log("Passwort stimmt auch."); 

                          $('#message_box').removeClass('bg-danger');
                          $('#message_box').addClass("bg-success");
                          $('#message_box').append("<p>Sehr gut, du bist jetzt authorisiert!</p>");
                          $('.form-group').hide();
                          $('input[type="submit"]').removeAttr('disabled');
                          $("#uploadForm").removeAttr('action');
                          $("#upload_button").removeClass('disabled');
                          $("#uploadForm").attr('action','/upload/transferFile/'+data[0]['id']);

                        }else{
                          console.log("Authentifizierung fehlgeschlagen. Passwort falsch.");
                          $('#message_box').addClass("bg-danger");
                          $('#message_box').html("<p>Authentifizierung ist fehlgeschlagen. Prüfe deine Logindaten.</p>");
                        }

                        console.log("#### Password-Check End ####");
                    },
                    error: function (xhr, status, error) {
                        console.log('Error: ' + error.message);
                        $('#respond').html('Error connecting to the server.');
                    }
                  });
      


              }else{
                console.log("Authentifizierung fehlgeschlagen. Username existiert nicht.");
                $('#message_box').addClass("bg-danger");
                $('#message_box').html("<p>Authentifizierung ist fehlgeschlagen. </p>");
                        
              }

              console.log("#### Login-Check Sucess End ####");
          },
          error: function (xhr, status, error) {
              console.log('Error: ' + error.message);
              $('#respond').html('Error connecting to the server.');
          }
      });

      

  }else{
      console.log("Formcheck nicht in Ordnung.");
  }
}



function serverTest(){

  var jsonData = [];

  jsonData.push({
      action: "showTableTest"
  });


  $.ajax({
      url: 'http://127.0.0.1:5433',
      // dataType: "jsonp",
      data: JSON.stringify(jsonData),
      dataType: "json",
      type: 'POST',
      jsonpCallback: 'callback', // this is not relevant to the POST anymore
      success: function (data) {
          //var ret = jQuery.parseJSON(data);
          //$('#respond').html(ret.msg);
          //var JSONObject = JSON.parse(data);

          var length = data.length;

          console.log(length);

          for(var i = 0; i<length; i++){
            //console.log('Success: ' + JSONObject[i]['id']);
          }
      },
      error: function (xhr, status, error) {
          console.log('Error: ' + error.message);
          $('#respond').html('Error connecting to the server.');
      },
  });
}

function addUserToDB(pUsername, pPassword, pEmail){

  var jsonData = [];

  jsonData.push({
      username: pUsername,
      password: pPassword,
      email: pEmail
  });

  console.log(jsonData);

  $.ajax({
      url: '/registrieren/newUser',
      // dataType: "jsonp",
      data: JSON.stringify(jsonData),
      dataType: "json",
      type: 'POST',
      jsonpCallback: 'callback', // this is not relevant to the POST anymore
      success: function (data) {
          if(data[0]['createnewuser']){
            $('.form-group').hide();
              $('#message_box').addClass("bg-success");
              $('#message_box').append("<p>Du wurdest erfolgreich registriert!</p>");
          }else{
              $('#message_box').addClass("bg-danger");
              $('#message_box').append("<p>Irgendetwas ist schief gelaufen. Probiere es bitte erneuert!</p>");
          }
      },
      error: function (xhr, status, error) {
          console.log('Error: ' + error.message);
          $('#respond').html('Error connecting to the server.');
      },
  });
  
  

  
}


function checkRegisterForm(){
  if(!$('#username_input').val()){
      alert("Username nicht ausgefüllt.");
      return false;
  }else if(!$('#password_input').val()){
      alert("Passwort nicht ausgefüllt.");
      return false;
  }else if(!$('#password_verification_input').val()){
      alert("Passwort Überprüfung nicht ausgefüllt.");
      return false;
  }else if(!$('#email_input').val()){
      alert("Email nicht ausgefüllt.");
      return false;
  }else if(!isValidEmailAddress($('#email_input').val())){
      alert("Email nicht valide.");
      return false;
  }else if($('#password_input').val() != $('#password_verification_input').val()){
      alert("Die zwei Passwörter sind nicht die gleichen.");
      return false;
  }else{
    console.log("checkRegisterForm() ist durchgelaufen.")
    return true;
  }
}

function isValidEmailAddress(emailAddress) {
    var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
    return pattern.test(emailAddress);
};

function loadGPXFileIntoGoogleMap(map, filename){
      $.ajax({url: filename,
      dataType: "xml",
      success: function(data) {
        var parser = new GPXParser(data, map);
        parser.setTrackColour("#ff0000");     // Set the track line colour
        parser.setTrackWidth(5);          // Set the track line width
        parser.setMinTrackPointDelta(0.001);      // Set the minimum distance between track points
        parser.centerAndZoom(data);
        parser.addTrackpointsToMap();         // Add the trackpoints
        parser.addWaypointsToMap();           // Add the waypoints
      }
      });
}

function loadGPXFileIntoGoogleMap(map, data){
      $.ajax({url: "loadGPXTrack",
      dataType: "xml",
      success: function(data) {
        var parser = new GPXParser(data, map);
        parser.setTrackColour("#ff0000");     // Set the track line colour
        parser.setTrackWidth(5);          // Set the track line width
        parser.setMinTrackPointDelta(0.001);      // Set the minimum distance between track points
        parser.centerAndZoom(data);
        parser.addTrackpointsToMap();         // Add the trackpoints
        parser.addWaypointsToMap();           // Add the waypoints
      }
      });
}

function isFiletransferComplete(){
  var isComplete = getUrlParameter('complete');
  if(isComplete){
    $('#message_box').addClass("bg-success");
    $('#message_box').append("<p>Die Datei wurde erfolgreich hochgeladen!</p>");
  }
}

function showProfile(){
  var jsonData = [];

  jsonData.push({
      action: "getUserData"
  });

  $.ajax({
    url: window.location.href,
    // dataType: "jsonp",
    data: JSON.stringify(jsonData),
    dataType: "json",
    type: 'POST',
    jsonpCallback: 'callback', // this is not relevant to the POST anymore
    success: function (data) {
        console.log(data);
        $("#delete_button").attr("onclick","deleteUser("+data[0]['id']+");");
        $("#username_placeholer").append(data[0]['username']);
        $("#email_placeholder").append(data[0]['email']);
    },
    error: function (xhr, status, error) {
        console.log('Error: Request faild.');
        $('#respond').html('Error connecting to the server.');
    },
  });

}

function deleteUser(userid){
  console.log("Delete User");
   $.ajax({
    url: '/mitglieder/'+userid+'/delete',
    type: 'POST',
    jsonpCallback: 'callback', // this is not relevant to the POST anymore
    success: function (data) {
        window.location.replace(nodeJsURL+'mitglieder/');
    },
    error: function (xhr, status, error) {
        console.log('Error: ' + error.message);
        $('#respond').html('Error connecting to the server.');
    },
  });
}

function deleteActivity(activityid){
  console.log("Delete Activity");
   $.ajax({
    url: '/mitglieder/aktivitaet/'+activityid+'/delete',
    type: 'POST',
    jsonpCallback: 'callback', // this is not relevant to the POST anymore
    success: function (data) {
        window.location.replace(nodeJsURL+'mitglieder/');
    },
    error: function (xhr, status, error) {
        console.log('Error: ' + error.message);
        $('#respond').html('Error connecting to the server.');
    },
  });
}

function displayEncounterActivity(activityid){
  $.ajax({
    url: '/mitglieder/aktivitaet/getEncounterActivity/'+activityid+'/',
    type: 'POST',
    dataType: 'json',
    jsonpCallback: 'callback', // this is not relevant to the POST anymore
    success: function (data) {
        console.log("success.");
        showEncounterActivityTrack(data, "green");
       

    },
    error: function (xhr, status, error) {
        console.log('Error: ' + error.message);
        $('#respond').html('Error connecting to the server.');
    },
  });
}

function showActivity(){
  var jsonData = [];

  jsonData.push({
      action: "getActivityData"
  });


  $.ajax({
    url: window.location.href,
    // dataType: "jsonp",
    data: JSON.stringify(jsonData),
    dataType: "json",
    type: 'POST',
    jsonpCallback: 'callback', // this is not relevant to the POST anymore
    success: function (data) {
        console.log("success.");
        var userid = data[0]['user_id'];
        var activityid = data[0]['id'];
        $("#delete_button").attr("onclick","deleteActivity("+activityid+");");
        $("#userid_placeholder").append("<a href=\"/mitglieder/profil/"+userid+"/\">"+data[0]['username']+"</a>");
        $("#date_placeholder").append($.format.date(data[0]['start_time'], "dd.MM.yyyy"));
        $("#distance_placeholder").append(Math.round(data[0]['distance']/1000)+"km");
        $("#duration_placeholder").append(getCorrectDuration(data[0]['duration']));
        
        

        console.log(activityid + "Activity ID # " + userid);

        $.ajax({
          url: window.location.href+'getTrackData',
          // dataType: "jsonp",
          data: JSON.stringify(jsonData),
          dataType: "json",
          type: 'POST',
          jsonpCallback: 'callback', // this is not relevant to the POST anymore
          success: function (data) {
              showActivityTrack(data,activityid,userid,"#ff0000");
          },
          error: function (xhr, status, error) {
              console.log('Error: ' + error.message);
              $('#respond').html('Error connecting to the server.');
          },
        });

    },
    error: function (xhr, status, error) {
        console.log('Error: ' + error.message);
        $('#respond').html('Error connecting to the server.');
    },
  });
}

function showActivityTrack(gpxData,activityid,userid,colour){


  var pointarray = [];

  var gpxPoint = jQuery.parseJSON(gpxData[0]['st_asgeojson']);

  var lastlon = parseFloat(gpxPoint['coordinates'][0]);
  var lastlat = parseFloat(gpxPoint['coordinates'][1]);
  var latlng = new google.maps.LatLng(lastlat,lastlon);

  globalMapVar.panTo(latlng);


  pointarray.push(latlng);



  for(var i = 1; i < gpxData.length-1; i++) {
      gpxPoint = jQuery.parseJSON(gpxData[i]['st_asgeojson']);
      var lon = parseFloat(gpxPoint['coordinates'][0]);
      var lat = parseFloat(gpxPoint['coordinates'][1]);

      // Verify that this is far enough away from the last point to be used.
      var latdiff = lat - lastlat;
      var londiff = lon - lastlon;
      if(Math.sqrt(latdiff*latdiff + londiff*londiff)
              > 0.0001) {
          lastlon = lon;
          lastlat = lat;
          latlng = new google.maps.LatLng(lat,lon);
          pointarray.push(latlng);
      }

  }

  var polyline = new google.maps.Polyline({
      path: pointarray,
      strokeColor: colour,
      strokeWeight: 5,
      map: globalMapVar
  });

  zoomAndCenterMap(globalMapVar,pointarray);

  // Karte der eigenen Aktivität ist initialisiert und wird angezeigt...

  // Kümmern um die Begegnungen 

  // Ajax Request für Abfrage der möglichen Encounters

  $.ajax({
    url: '/mitglieder/aktivitaet/getEncounters/'+activityid+'/'+userid+'/',
    type: 'POST',
    dataType: 'json',
    jsonpCallback: 'callback', // this is not relevant to the POST anymore
    success: function (data) {
          console.log("success.");
          var encounterActivityId;
          var encounterDuration;
          var encounterDistance;
          var encounterWith;
          var encounterUserid;
           // Encounter Activities werden zur Map hinzugefügt


          for(var j = 0;j < data.length; j++){

            encounterDistance = data[j]['distance'];
            encounterDuration = getCorrectDuration(data[j]['duration']);

            encounterWith = data[j]['username'];
            encounterUserid = data[j]['idofuser'];

            if(data[j]['id1']!=activityid){
              encounterActivityId = data[j]['id1'];
            }else{
              encounterActivityId = data[j]['id2'];
            }

            $('#encounters').append("<li>Begegnung mit <a href=\"/mitglieder/aktivitaet/"+encounterActivityId+"/\">" + encounterWith + "</a> <strong> " +Math.round(encounterDistance/1000) + "km  - "+ encounterDuration +"</strong> <button id=\"toggleButton"+encounterActivityId+"\" onclick=\"toggleEncounterTrack("+encounterActivityId+");\" class=\"btn btn-success\">Tour Anzeigen</button>");

            google.maps.event.addListener(globalMapVar, 'click', showEncounterActivityTrack(null,encounterActivityId,trackColours[j%6]));
          }
      },
      error: function (xhr, status, error) {
          console.log('Error: ' + error.message);
          $('#respond').html('Error connecting to the server.');
      },
    });


 
  

  console.log("showActivityTrack durchgelaufen...");

}

function getCorrectDuration(duration){
  if(duration == null){
    return "Datenfehler!";
  }else{
    var encounterDuration;
    encounterDuration = duration['hours']+":";

    if(duration['minutes']<10){
      encounterDuration += '0'+duration['minutes'];
    }else{
      encounterDuration += duration['minutes'];
    }

    encounterDuration+= ":";

    if(duration['seconds']<10){
      encounterDuration += '0'+duration['seconds'];
    }else{
      encounterDuration += duration['seconds'];
    }

    return encounterDuration;
  }
}

function showEncounterActivityTrack(map,activityid,colour){

$.ajax({
    url: '/mitglieder/aktivitaet/getEncounterActivity/'+activityid+'/',
    type: 'POST',
    dataType: 'json',
    jsonpCallback: 'callback', // this is not relevant to the POST anymore
    success: function (data) {
        console.log("success.");
        

        var pointarray = [];

        var gpxPoint = jQuery.parseJSON(data[0]['st_asgeojson']);

        var lastlon = parseFloat(gpxPoint['coordinates'][0]);
        var lastlat = parseFloat(gpxPoint['coordinates'][1]);
        var latlng = new google.maps.LatLng(lastlat,lastlon);

        pointarray.push(latlng);



        for(var i = 1; i < data.length-1; i++) {
            gpxPoint = jQuery.parseJSON(data[i]['st_asgeojson']);
            var lon = parseFloat(gpxPoint['coordinates'][0]);
            var lat = parseFloat(gpxPoint['coordinates'][1]);

            // Verify that this is far enough away from the last point to be used.
            var latdiff = lat - lastlat;
            var londiff = lon - lastlon;
            if(Math.sqrt(latdiff*latdiff + londiff*londiff)
                    > 0.0001) {
                lastlon = lon;
                lastlat = lat;
                latlng = new google.maps.LatLng(lat,lon);
                pointarray.push(latlng);
            }

        }

        var polyline = new google.maps.Polyline({
            path: pointarray,
            strokeColor: colour,
            strokeWeight: 3,
            map: map
        });

        polylines[activityid] = polyline;
        


        console.log("showActivityTrack durchgelaufen...");
    },
    error: function (xhr, status, error) {
        console.log('Error: ' + error.message);
        $('#respond').html('Error connecting to the server.');
    },
  });
  

}

function toggleEncounterTrack(activityid){
  console.log("Toggle EncounterTrack");
  var buttonid = '#toggleButton'+activityid;
  if(polylines[activityid].getMap() == null){
    $(buttonid).removeClass('btn-success');
    $(buttonid).addClass('btn-danger');
    $(buttonid).html('Tour ausblenden');
    polylines[activityid].setMap(globalMapVar);
  }else{
    polylines[activityid].setMap(null);
    $(buttonid).removeClass('btn-danger');
    $(buttonid).addClass('btn-success');
    $(buttonid).html('Tour anzeigen');
  }
}



function zoomAndCenterMap(map, data){
  console.log(data);
  var minlat = 0;
    var maxlat = 0;
    var minlon = 0;
    var maxlon = 0;

    for(var pointtype = 0; pointtype < data.length; pointtype++) {


        // If the min and max are uninitialized then initialize them.
        if((data.length > 0) && (minlat == maxlat) && (minlat == 0)) {
            minlat = data[0]['G'];
            maxlat = data[0]['G'];
            minlon = data[0]['K'];
            maxlon = data[0]['K'];
        }

        for(var i = 0; i < data.length; i++) {
            var lon = data[i]['K'];
            var lat = data[i]['G'];

            if(lon < minlon) minlon = lon;
            if(lon > maxlon) maxlon = lon;
            if(lat < minlat) minlat = lat;
            if(lat > maxlat) maxlat = lat;
        }
    }

    if((minlat == maxlat) && (minlat == 0)) {
        map.setCenter(new google.maps.LatLng(49.327667, -122.942333), 14);
        return;
    }

    // Center around the middle of the points
    var centerlon = (maxlon + minlon) / 2;
    var centerlat = (maxlat + minlat) / 2;

    console.log(minlat + ", " + maxlat + ", "+ minlon + ", "+ maxlon);

    var bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(minlat, minlon),
            new google.maps.LatLng(maxlat, maxlon));
    map.setCenter(new google.maps.LatLng(centerlat, centerlon));
    map.fitBounds(bounds);

}

function getUseridFromURL(){
  var sPageURL = window.location.href;
  console.log("sPageURL= "+ sPageURL);
  var sURLVariables = sPageURL.split('/');
  var length = sURLVariables.length;

  return parseInt(sURLVariables[length-2]);
}

function getUrlParameter(sParam){
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++){
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam){
            return sParameterName[1];
        }
    }
}  



function showGPXTrack(){
  var path = $('#inputFile').val();

  var splits = path.split("\\");

  console.log(splits);

  var lastIndex = splits.length;

  var fileName = splits[lastIndex-1];


  alert(fileName);

  $('#display_content').empty();
  $('#display_content').append(fileName);

  var mapOptions = {
    zoom: 8,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  var map = new google.maps.Map(document.getElementById("map"),
      mapOptions);

  loadGPXFileIntoGoogleMap(map, fileName);
}    

/*$(document).ready(function() {
    
    var map;
    function initialize() {
      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 8,
        center: {lat: -34.397, lng: 150.644}
      });
    }

    google.maps.event.addDomListener(window, 'load', initialize);

    console.log( "ready!" );
});*/