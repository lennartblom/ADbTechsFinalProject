///////////////////////////////////////////////////////////////////////////////
// loadgpx.4.js
//
// Javascript object to load GPX-format GPS data into Google Maps.
//
// Copyright (C) 2006 Kaz Okuda (http://notions.okuda.ca)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// If you use this script or have any questions please leave a comment
// at http://notions.okuda.ca/geotagging/projects-im-working-on/gpx-viewer/
// A link to the GPL license can also be found there.
//
///////////////////////////////////////////////////////////////////////////////
//
// History:
//    revision 1 - Initial implementation
//    revision 2 - Removed LoadGPXFileIntoGoogleMap and made it the callers
//                 responsibility.  Added more options (colour, width, delta).
//    revision 3 - Waypoint parsing now compatible with Firefox.
//    revision 4 - Upgraded to Google Maps API version 2.  Tried changing the way
//               that the map calculated the way the center and zoom level, but
//               GMAP API 2 requires that you center and zoom the map first.
//               I have left the bounding box calculations commented out in case
//               they might come in handy in the future.
//
//    5/28/2010 - Upgraded to Google Maps API v3 and refactored the file a bit.
//                          (Chris Peplin)
//
// Author: Kaz Okuda
// URI: http://notions.okuda.ca/geotagging/projects-im-working-on/gpx-viewer/
//
// Updated for Google Maps API v3 by Chris Peplin
// Fork moved to GitHub: https://github.com/peplin/gpxviewer
//
///////////////////////////////////////////////////////////////////////////////
function GPXParser(e,t){this.xmlDoc=e;this.map=t;this.trackcolour="#ff00ff";this.trackwidth=5;this.mintrackpointdelta=1e-4}GPXParser.prototype.setTrackColour=function(e){this.trackcolour=e};GPXParser.prototype.setTrackWidth=function(e){this.trackwidth=e};GPXParser.prototype.setMinTrackPointDelta=function(e){this.mintrackpointdelta=e};GPXParser.prototype.translateName=function(e){if(e=="wpt")return"Waypoint";if(e=="trkpt")return"Track Point"};GPXParser.prototype.createMarker=function(e){var t=parseFloat(e.getAttribute("lon")),n=parseFloat(e.getAttribute("lat")),r="",s=e.getElementsByTagName("html");if(s.length>0)for(i=0;i<s.item(0).childNodes.length;i++)r+=s.item(0).childNodes[i].nodeValue;else{r="<b>"+this.translateName(e.nodeName)+"</b><br>";var o=e.attributes,u=o.length;for(i=0;i<u;i++)r+=o.item(i).name+" = "+o.item(i).nodeValue+"<br>";if(e.hasChildNodes){var a=e.childNodes,f=a.length;for(i=0;i<f;i++){if(a[i].nodeType!=1)continue;if(a[i].firstChild==null)continue;r+=a[i].nodeName+" = "+a[i].firstChild.nodeValue+"<br>"}}}var l=new google.maps.Marker({position:new google.maps.LatLng(n,t),map:this.map}),c=new google.maps.InfoWindow({content:r,size:new google.maps.Size(50,50)});google.maps.event.addListener(l,"click",function(){c.open(this.map,l)})};GPXParser.prototype.addTrackSegmentToMap=function(e,t,n){var r=e.getElementsByTagName("trkpt");if(r.length==0)return;var i=[],s=parseFloat(r[0].getAttribute("lon")),o=parseFloat(r[0].getAttribute("lat")),u=new google.maps.LatLng(o,s);i.push(u);for(var a=1;a<r.length;a++){var f=parseFloat(r[a].getAttribute("lon")),l=parseFloat(r[a].getAttribute("lat")),c=l-o,h=f-s;if(Math.sqrt(c*c+h*h)>this.mintrackpointdelta){s=f;o=l;u=new google.maps.LatLng(l,f);i.push(u)}}var p=new google.maps.Polyline({path:i,strokeColor:t,strokeWeight:n,map:this.map})};GPXParser.prototype.addTrackToMap=function(e,t,n){var r=e.getElementsByTagName("trkseg");for(var i=0;i<r.length;i++)var s=this.addTrackSegmentToMap(r[i],t,n)};GPXParser.prototype.centerAndZoom=function(e){var t=new Array("trkpt","wpt"),n=0,r=0,i=0,s=0;for(var o=0;o<t.length;o++){var u=e.getElementsByTagName(t[o]);if(u.length>0&&n==r&&n==0){n=parseFloat(u[0].getAttribute("lat"));r=parseFloat(u[0].getAttribute("lat"));i=parseFloat(u[0].getAttribute("lon"));s=parseFloat(u[0].getAttribute("lon"))}for(var a=0;a<u.length;a++){var f=parseFloat(u[a].getAttribute("lon")),l=parseFloat(u[a].getAttribute("lat"));f<i&&(i=f);f>s&&(s=f);l<n&&(n=l);l>r&&(r=l)}}if(n==r&&n==0){this.map.setCenter(new google.maps.LatLng(49.327667,-122.942333),14);return}var c=(s+i)/2,h=(r+n)/2,p=new google.maps.LatLngBounds(new google.maps.LatLng(n,i),new google.maps.LatLng(r,s));this.map.setCenter(new google.maps.LatLng(h,c));this.map.fitBounds(p)};GPXParser.prototype.centerAndZoomToLatLngBounds=function(e){var t=new google.maps.LatLngBounds;for(var n=0;n<e.length;n++)if(!e[n].isEmpty()){t.extend(e[n].getSouthWest());t.extend(e[n].getNorthEast())}var r=(t.getNorthEast().lat()+t.getSouthWest().lat())/2,i=(t.getNorthEast().lng()+t.getSouthWest().lng())/2;this.map.setCenter(new google.maps.LatLng(r,i),this.map.getBoundsZoomLevel(t))};GPXParser.prototype.addTrackpointsToMap=function(){var e=this.xmlDoc.documentElement.getElementsByTagName("trk");for(var t=0;t<e.length;t++)this.addTrackToMap(e[t],this.trackcolour,this.trackwidth)};GPXParser.prototype.addWaypointsToMap=function(){var e=this.xmlDoc.documentElement.getElementsByTagName("wpt");for(var t=0;t<e.length;t++)this.createMarker(e[t])};