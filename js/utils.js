// Sign up at http://cocoafish.com and create an app.
// Insert your Cocoafish app API key here.
//var sdk = new Cocoafish('NIE4y3ax2UnmiWtkpi3Rbr9RChBvit2a');

/* 
 * Use OAuth key to initialize SDK
 */
var isProduction = false;

var acsAppKey = "8bKXN3OKNtoE1mBMR4Geo4kIY4bm9xqr";
var acsOAuthKey = "K25ozMNbVQ0wH2xpQ5YR8YEWomFO5M61";
var acsOAuthSecret = "6HjCZezCRZcQQZrOlEDApl3G4FEBGvn7";

if(isProduction) {
    acsOAuthKey = "";
}

var sdk = new Cocoafish(acsAppKey);

//redirectUri can also be specified when calling sdk.sendAuthRequest, sdk.signUpRequest, and sdk.invalidateTokenRequest.
sdk.redirectUri = 'http://localhost:8000/connect.html';
sdk.apiBaseURL = 'api.cloud.appcelerator.com';

sdk.oauthSecret = acsOAuthSecret;

// Sign up at http://cocoafish.com and create an app.
var userId;
var userFbId; 

function loginUser(_userLogin, _passwd) {
    $('#container').showLoading();
    sdk.sendRequest('users/login.json', 'POST', {login:_userLogin, password: _passwd}, function(responseData) {
        if(responseData && responseData.meta && responseData.meta.code == 200) {
            //console.log(responseData);
            localStorage.setItem("userId", responseData.response.users[0].id); 
            localStorage.setItem("userFbId", responseData.response.users[0].external_accounts[0].external_id);
            //console.log('userId: '+userId+', userFbId: '+userFbId);
            window.location = 'main.html';
        } else {
            alert(responseData.meta.message);
            $('#container').hideLoading();
        }
    });
}

function logoutUser() {
    if(confirm('Are you sure want to logout?')) {
        sdk.sendRequest('users/logout.json', 'GET', null, function(responseData) {
            if(responseData && responseData.meta && responseData.meta.code == 200) {
                window.location = 'login.html';
            }
        });
    }
}

function loadSignUp() {
    $('#container').showLoading();
    $.ajax({
        url: 'signup.html',
        success: function(data) {
            $('#mainArea').html(data);
            $('#container').hideLoading();
        }
    });
}

function createUser(email, fName, lName, password, pwd_confirm) {
    var userData = {
            email: email, 
            first_name: fName, 
            last_name: lName, 
            password: password, 
            password_confirmation: pwd_confirm
    };
    sdk.sendRequest('users/create.json', 'POST', userData, function(data) {
        if(data && data.meta && data.meta.code == 200) {
            window.location = 'places.html';
        } else {
            alert(data.meta.message)
        }
    });
}

function testAuthUser(callback, errorCallback, loadingArea) {
    loadingArea.showLoading();
    sdk.sendRequest('users/show/me.json', 'GET', null, function(data) {
        if(data) {
            if(data.meta) {
                var meta = data.meta;
                if(meta.status == 'ok' && meta.code == 200) {
                    userId = data.response.users[0].id;
                    loadingArea.hideLoading();
                    $('#content').css('visibility', 'visible');
                    callback();
                    return ;
                }
            }
        }
        loadingArea.hideLoading();
        errorCallback(callback);
    });
}

function showLoginDialog(callback) {
    $.ajax({
        url: 'loginDialog.html',
        dataType: 'html',
        success: function(data) {
            var loginDialog = $('<div>');
            loginDialog.html(data);
            loginDialog.dialog({
                autoOpen: false,
                height: 200,
                width: 350,
                modal: true,
                resizable: false,
                show: 'slide',
                hide: 'explode',
                title: 'Login',
                closeText: 'hide',
                dialogClass:'dialogStyle',
                buttons: {
                    login: function() {
                        dialogLogin(callback);
                    },
                    reset: function() {
                        
                    }
                }
            });
            loginDialog.dialog( "open" );
        }
    });
}

function dialogLogin(callback) {
    var userName = $.trim($('#userName').val());
    var passwd = $('#password').val();
    if(!userName || !passwd) {
        $('#errorMsg').show();
    } else {
        $('#errorMsg').hide();
        $('.dialogStyle').showLoading();
        
        sdk.sendRequest('users/login.json', 'POST', {login:userName, password: passwd}, function(data) {
            if(data && data.meta && data.meta.code == 200) {
                userId = data.response.users[0].id;
                callback();
                $('#content').css('visibility', 'visible');
                $('.dialogStyle').hideLoading();
                $('.dialogStyle').remove();
            } else {
                alert(data.meta.message);
                $('.dialogStyle').hideLoading();
            }
        });
    }
}

function logoutUser() {
    $('#container').showLoading();
    sdk.sendRequest('users/logout.json', 'GET', null, function(data) {
        window.location = 'login.html';
    });
}

function getPlaces() {
    sdk.sendRequest('places/search.json', 'GET', null, function(data) {
        if(data) {
            if(data.meta) {
                if(data.meta.code == '200' && data.meta.status == 'ok' && data.meta.method_name == 'searchPlaces') {
                    initializeMap(data.response.places);
                    createPlacesGrid(data.response.places);
                }
            }
        }
    });
}

function createPlacesGrid(places) {
      if(places) {
          $("#placesGrid").jqGrid({
                datatype: "local",
                colNames:['Name','Address', 'City', 'State','Country','Check In', 'ID'],
                colModel:[
                    {name:'name',index:'name', width:200, sorttype:"string"},
                    {name:'address',index:'address', width:200, sorttype:"string"},
                    {name:'city',index:'city', width:100, sorttype:"string"},
                    {name:'state',index:'state', width:80,align:"center",sorttype:"string"},
                    {name:'country',index:'country', width:80,sorttype:"string"},   
                    {name:'checkin',index:'checkin', width:100, sortable:false, align:"center", formatter: checkInFormatter},
                    {name:'id',index:'id', hidden:true}
                ],
                multiselect: false,
                height: "100%",
                altRows: true,
                rownumbers:true,
                autowidth:true,
                caption: "  All Places"
            });
            for(var i=0;i<=places.length;i++)
                $("#placesGrid").jqGrid('addRowData', i+1 , places[i]);
      }
}

function initializeMap(places) {
    var bounds = new google.maps.LatLngBounds();
    var markers = new Array();
    if(places && places.length) {
            for(var i=0;i<places.length;i++) {
                var latlng = new google.maps.LatLng(places[i].latitude, places[i].longitude);
                bounds.extend(latlng);
                var marker = new google.maps.Marker({
                    position: latlng,
                    title: places[i].name
                });
                markers[i] = marker;
            }
    }
    
    var myOptions = {
      zoom: 16,
      center: bounds.getCenter(),
      //center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      panControl:true
    };
    var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
        map.fitBounds(bounds);
    
    var infowindow = new google.maps.InfoWindow({
            content: 'Hello world' 
    });
    
    for(var i=0;i<markers.length;i++) {
            markers[i].setAnimation(google.maps.Animation.DROP);
            markers[i].setMap(map);
            createMarkerListeners(markers[i], places[i], map, infowindow);
    }               
}

function createMarkerListeners(marker, place, map, infowindow) {
    google.maps.event.addListener(marker, 'click', function(event) {
        infowindow.close();
        infowindow.setContent("<span style='font-size:12px'>" + place.name + "</span>");
        infowindow.open(map, marker);
    });
}

function checkInFormatter(cellvalue, options, rowObject) {
  return '<a href="javascript:void(0)" onclick="checkinPlace(\'' + rowObject.id + '\')"><span class="ui-icon ui-icon-circle-check" style="margin:0 auto;cursor:hand"/></a>';
}

function checkinPlace(placeId) {
      if(placeId) {
          sdk.sendRequest('checkins/create.json', 'POST', {place_id:placeId}, function(data) {
              if(data) {
                    if(data.meta) {
                        if(data.meta.code == '200' && data.meta.status == 'ok' && data.meta.method_name == 'createCheckin') {
                            alert('Check in successful!');
                        } else {
                            alert(data.meta.message);
                        }
                    }
                }
            });
      }
}

function loadProgramsShowingNow() {
    var now_full = moment().format('YYYY-MM-DD,HH:mm:ss');
    var data = {
        where: '{"start_time":{"$lte":"'+now_full+'"},"end_time":{"$gte":"'+now_full+'"} ,"program_country":"th"}',
        response_json_depth: 3,
        per_page: 50
            //event_id: '4d870f8bd0afbe1074000017'
    };
    
    sdk.sendRequest('events/query/occurrences.json', 'GET', data, function(data) {
        if(data) {
            if(data.meta) {
                var meta = data.meta;
                if(meta.status == 'ok' && meta.code == 200  && meta.method_name == 'queryEventOccurrences') {
                    var eventOccurrences = data.response.event_occurrences;
                    //will have to iterate and build stuff here
                    console.log(eventOccurrences);
                    var table = document.getElementById('programsNowTable');
                    for(var i=0; i < eventOccurrences.length; i++) {
                        var curEvent = eventOccurrences[i];
                        var rowCount = table.rows.length;
                        var row = table.insertRow(rowCount);

                        var cellAction = row.insertCell(0);
                        cellAction.innerHTML = '<a href="chat.html?programId='+curEvent.event.custom_fields.program_id+'">Chat</a> <a href="board.html?programId='+curEvent.event.custom_fields.program_id+'">Board</a>';

                        var cellName = row.insertCell(1);
                        cellName.innerHTML = curEvent.event.name;

                        var cellSubname = row.insertCell(2);
                        cellSubname.innerHTML = curEvent.event.custom_fields.subname;

                        var cellStartTime = row.insertCell(3);
                        cellStartTime.innerHTML = curEvent.start_time;

                        var cellEndTime = row.insertCell(4);
                        cellEndTime.innerHTML = curEvent.end_time;

                        var cellDuration = row.insertCell(5);
                        cellDuration.innerHTML = curEvent.event.duration;

                        var cellProgramType = row.insertCell(6);
                        cellProgramType.innerHTML = curEvent.event.custom_fields.program_type;

                        var cellImage = row.insertCell(7);
                        var imageElement = document.createElement("img");
                        imageElement.src = curEvent.event.photo.urls.square_75;
                        cellImage.appendChild(imageElement);

                        var cellChannel = row.insertCell(8);
                        cellChannel.innerHTML = curEvent.event.custom_fields.channel_id;

                        var cellCountry = row.insertCell(9);
                        cellCountry.innerHTML = curEvent.event.custom_fields.program_country;

                        var cellProgramId = row.insertCell(10);
                        cellProgramId.innerHTML = curEvent.event.custom_fields.program_id;

                        var cellId = row.insertCell(11);
                        cellId.innerHTML = curEvent.event.id;
                    }
                } else console.log('something wrong with meta.status: loadProgramsShowingNow');
            } else console.log('something wrong with data.meta: loadProgramsShowingNow');
        } else console.log('something wrong with data: loadProgramsShowingNow');
    });
}

function insertChatMessage(_message) {
    var table = document.getElementById('chatTable');
//    var rowCount = table.rows.length;
    var row = table.insertRow(2); //insert after header and total num chatters row

    var cellUserId = row.insertCell(0);
    cellUserId.innerHTML = _message.senderId;

    var cellUserFbId = row.insertCell(1);
    cellUserFbId.innerHTML = _message.senderFbId;

    var cellImage = row.insertCell(2);
    var imageElement = document.createElement("img");
    imageElement.src = 'https://graph.facebook.com/'+_message.senderFbId+'/picture';
    cellImage.appendChild(imageElement);

    var cellTime = row.insertCell(3);
    cellTime.innerHTML = _message.time;

    var cellMessage = row.insertCell(4);
    cellMessage.innerHTML = _message.text;
}

function loadProgramInfo(_programId) {

    var data = {
        where: '{"program_id":"'+_programId+'"}',
        page: 1, 
        per_page: 1,
        response_json_depth: 2,
        order: '-created_at'
    };
    sdk.sendRequest('events/query.json', 'GET', data, function(data) {
        if(data) {
            if(data.meta) {
                var meta = data.meta;
                if(meta.status == 'ok' && meta.code == 200 && meta.method_name == 'queryEvents') {
                    var events = data.response.events;
                    console.log(events);
                    $('#programId').html(events[0].custom_fields.program_id);
                    $('#programName').html(events[0].name);
                } else console.log('something wrong with meta.status: loadProgramInfo');
            } else console.log('something wrong with data.meta: loadProgramInfo');
        } else console.log('something wrong with data: loadProgramInfo');
    });
}

function loadTopicsOfProgramId(_programId) {
    var data = {
        where: '{"program_id":"'+_programId+'"}',
        page: 1, 
        per_page: 100,
        response_json_depth: 2,
        order: '-created_at'
    };
    sdk.sendRequest('posts/query.json', 'GET', data, function(data) {
        if(data) {
            if(data.meta) {
                var meta = data.meta;
                if(meta.status == 'ok' && meta.code == 200 && meta.method_name == 'queryPosts') {

                    $('#totalTopics').html(meta.total_results);
                    var posts = data.response.posts;
                    var table = document.getElementById('topicsTable');

                    for(var i=0; i < posts.length; i++) {
                        var curPost = posts[i];
                        var rowCount = table.rows.length;
                        var row = table.insertRow(rowCount);

                        var cellDetails = row.insertCell(0);
                        cellDetails.innerHTML = '<a href="comment.html?topicId='+curPost.id+'">details</a>';

                        var cellNumComments = row.insertCell(1);
                        cellNumComments.innerHTML = curPost.reviews_count;

                        var cellTopic = row.insertCell(2);
                        cellTopic.innerHTML = curPost.title;

                        var cellContent = row.insertCell(3);
                        cellContent.innerHTML = curPost.content;

                        var cellTime = row.insertCell(4);
                        cellTime.innerHTML = curPost.updated_at;
                        
                        var cellUser = row.insertCell(5);
                        cellUser.innerHTML = curPost.user.username;
                    }
                } else console.log('something wrong with meta.status: loadTopicsOfProgramId');
            } else console.log('something wrong with data.meta: loadTopicsOfProgramId');
        } else console.log('something wrong with data: loadTopicsOfProgramId');
    });
}
