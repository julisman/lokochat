var app = angular.module('Chatslokomedia', [
    "ngRoute",
    "ngTouch",
    "mobile-angular-ui",
    "LocalStorageModule"
]);

app.config(function($routeProvider, $locationProvider) {
    $routeProvider.when('/',          {templateUrl: "login.html"});
    $routeProvider.when('/home',          {templateUrl: "home.html"});
    $routeProvider.when('/register',          {templateUrl: "register.html"});
    $routeProvider.when('/chat',          {templateUrl: "chat.html"});
    $routeProvider.when('/addfriend',          {templateUrl: "addfriend.html"});
    $routeProvider.when('/friendrequest',          {templateUrl: "friendrequest.html"});
    $routeProvider.when('/penddingrequest',          {templateUrl: "penddingrequest.html"});
    $routeProvider.when('/login',          {templateUrl: "login.html"});

});


app.controller('MainController', function($rootScope, $scope,localStorageService,$location ){
    //set server socketio
    var socket = io.connect('http://93.188.163.202:2000');

    // set momeng lang
    // gunakan bahasa indonesia
    moment.lang('id');
    //set plugin notification
    window.plugin.notification.local.setDefaults({ autoCancel: true });
    window.plugin.notification.local.onclick = function (route, nama, id) {
        if(route == 'chat'){
            $scope.chatWith(id,nama);
        }
    };
    //login
    $scope.islogin = false;
    $scope.login = {};
    $scope.loginFn = function(){
        socket.emit('login',$scope.login,function(callback){
            if(!callback['error']){
                $scope.islogin = true;
                localStorageService.add('user',callback);
                $location.path('/home');
                $scope.datauser =localStorageService.get('user');
                $scope.$apply();
            }else{
                alert(callback['error']);
            }
        });
    };
    //logout
    $scope.logout = function(){
      socket.emit('logout',{userid : $scope.datauser['data']['_id']} ,function(callback){
            if(!callback['error']){
                $scope.islogin = false;
                localStorageService.remove('user');
                $location.path('/');
                $scope.$apply();
            }else{
                var msg = callback['error'];
                navigator.notification.alert(msg,'','Perhatikan!','ok');
            }
        });
    };

    //cek localstorage
    ($scope.cekLocalStorage = function(){
        if(!$scope.datauser){
            $location.path('/');
            localStorageService.remove('user');
        }
    })();

    //register
    $scope.reg = {};
    $scope.cek = {};
      // fungsi untuk validasi form
    $scope.is_validated = function(){
        var res = true,
            msg = '';

        if(typeof $scope.reg['nama'] === 'undefined' || $scope.reg['nama'] == ''){
            res = false;
            msg += 'Nama, ';
        }

        if(typeof $scope.reg['email'] === 'undefined' || $scope.reg['email'] == ''){
            res = false;
            msg += 'Email, ';
        }
        if(typeof $scope.reg['password'] === 'undefined' || $scope.reg['password'] == ''){
            res = false;
            msg += 'Password, ';
        }

        if($scope.reg['password'] != $scope.cek['confmpassword']){
            res = false;
            msg += 'Password Tidak cocok dengan Confm Password, ';
        }


        if(msg != ''){
            msg += 'harus di isi';
            navigator.notification.alert( msg,'','Perhatikan!','ok');
        }
        return res;
    };
    $scope.registerFn = function(){
        if($scope.is_validated()){
            socket.emit('registration',$scope.reg,function(callback){
                if(!callback['error']){
                    var msg = 'Registrasi Berhasil silahkan login dengan akun anda!';
                    navigator.notification.alert(msg, '', 'Perhatikan!','ok');
                }else{
                    var msg = callback['error'];
                    navigator.notification.alert( msg,'', 'error report!!','ok');
                }
            });
        }

    };
    $scope.cancelregisterFn = function(){
        $location.path('/');
    };
    //chat room
    $scope.chatWith = function(userids,nama){
        $scope.tmpuserid = userids;
        $scope.tmpnama   = nama;
            for(var a in $scope.datauser['data']['friends']){
                if($scope.datauser['data']['friends'].hasOwnProperty(a)){
                    if($scope.datauser['data']['friends'][a]['userid'] == userids && $scope.datauser['data']['friends'][a]['ischat']){
                        $scope.datauser['data']['friends'][a]['ischat'] = false;
                        break;
                    }
                }
            }

        $location.path('/chat');
    };

    $scope.messageshistory = {};
    $scope.tmp = {};

    // send message
    $scope.sendMessage = function(){
        $scope.messages = {
            from      : $scope.datauser['data']['_id'],
            fromname  : $scope.datauser['data']['nama'],
            to        : $scope.tmpuserid,
            message   : $scope.tmp['sendmessage'],
            time      : moment()
        };
          //event emit message
        socket.emit('message',$scope.messages,function(callback){       
          if(!callback['error']){
                  $scope.messages['time'] = moment($scope.messages['time']).format('DD-MMMM-YYYY HH:MM');
                  // add message ke model local
                //cek jika sudah ada object dengan key sebelumnya
                if ($scope.messageshistory.hasOwnProperty($scope.tmpuserid)){
                    $scope.messageshistory[$scope.tmpuserid].push($scope.messages);
                }else{
                    $scope.messageshistory[$scope.tmpuserid] =   [];
                    $scope.messageshistory[$scope.tmpuserid].push($scope.messages);
                }
                $scope.tmp['sendmessage'] = '';
          }else{
               var msg = callback['error'];
                navigator.notification.alert(msg,'','error report!', 'ok');
            }

            $scope.$apply();
        });
    };
      //event read message
    socket.on('message', function (data) {

        window.plugin.notification.local.add({
            id        :   moment(),
            title     :   data['fromname'],
            message   :   data['message'].substr(0,20) + ' ...',
            led       : 'A0FF05',
            json:       JSON.stringify({ routes:'chat', nama :data['fromname'],from:data['from'] })
        });
        data['time'] = moment(data['time']).format('DD-MMMM-YYYY HH:MM');
        if ($scope.messageshistory.hasOwnProperty(data['from'])){
            $scope.messageshistory[data['from']].push(data);
        }else{
            $scope.messageshistory[data['from']] =   [];
            $scope.messageshistory[data['from']].push(data);
        }

        for(var i = 0; i<= $scope.datauser['data']['friends'].length; i++){
            if($scope.datauser['data']['friends'][i]['userid'] == data['from']){
                $scope.datauser['data']['friends'][i]['ischat'] = true;
                break;
            }
        };
        $scope.$apply();
    });
    // adfriend
    $scope.add = {};
    $scope.addfriends = function(){
        $scope.messages = {
            email      : $scope.add.email,
            userid     : $scope.datauser['data']['_id']
        };
          //event add friend
        socket.emit('addfriend',$scope.messages,function(callback){
            if(!callback['error']){
                $scope.datauser['data']['penddingrequest'].push(callback['data']);
                  //push pendding request ke localstorage user
                localStorageService.remove('user');
                localStorageService.add('user', $scope.datauser);

                $scope.add['email'] = '';
                alert('sukses tambah teman');
            }else{
                var msg = callback['error'];
                navigator.notification.alert(msg,'','error report!','ok');
            }
        });
    };
    // notif
    $scope.notif = {
        friendrequest : 0
    };
    // friend request
    socket.on('friendrequest',function(data){
        //push friend request ke localstorage user
        if(data){
            window.plugin.notification.local.add({
                id        :  moment(),
                title     :   'Permintaan Pertemanan',
                message   :   data['nama'] +' Mengirim permintaan pertemenan',
                led       : 'A0FF05',
                json:       JSON.stringify({ routes:'home', nama :$scope.messages['fromname'],from:$scope.messages['from'] })
            });
            $scope.notif['friendrequest']++;
            $scope.datauser['data']['friendrequest'].push(data);
            localStorageService.remove('user');
            localStorageService.add('user', $scope.datauser);
            $scope.$apply();
        }

    });
    //function accept friend request
    $scope.acceptedFn = function(id,nama){

        if(confirm('Yakin mau accept ' + nama)){
            $scope.messages = {
                userid       : $scope.datauser['data']['_id'],
                nama        : $scope.datauser['data']['nama'],
                useridaccept : id,
                usernameaccept : nama
            };
              //event menerima teman
            socket.emit('acceptfriend',$scope.messages,function(callback){
                if(!callback['error']){
                    localStorageService.remove('user');
                    localStorageService.add('user', callback);
                    $scope.datauser = callback;
                    $scope.$apply();
                    $scope.notif['friendrequest']--;
                    alert('accepted');
                    $location.path('/home');
                    $scope.$apply();
                }else{
                    var msg = callback['error'];
                    navigator.notification.alert(msg,'','error report!','ok');
                }
            });
        }
    };

      //event friend request accepted
    socket.on('friendrequestaccepted',function(data){
          //push friend request ke localstorage user
        if(data){
            window.plugin.notification.local.add({
                id        :   moment(),
                title     :   'Permintaan Pertemanan Diterima',
                message   :   data['namaaccepted'] +' Menerima permintaan pertemenan',
                led       : 'A0FF05',
                json:       JSON.stringify({ routes:'home', nama :$scope.messages['fromname'],from:$scope.messages['from'] })
            });
            localStorageService.remove('user');
            localStorageService.add('user', {data : data['data']});
            $scope.datauser = {data : data['data']};
            $scope.$apply();
        }

    });

    //animasi loading ketika pindah halaman
    $rootScope.$on("$routeChangeStart", function(event,current){
        if(current.$$route.originalPath == '/') $location.path('/home');
        if(current.$$route.originalPath != '/register')$scope.cekLocalStorage();
        $rootScope.loading = true;
    });

    $rootScope.$on("$routeChangeSuccess", function(){
        $rootScope.loading = false;
    });
      // menetahui user agent
    $scope.userAgent =  navigator.userAgent;

});