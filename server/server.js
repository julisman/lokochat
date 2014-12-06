//create server
var app         = require('http').createServer(),
    io          = require('socket.io')(app);

/**
 * Setting port yang akan digunakan oleh server http
 */
app.listen(2000,function(err,res){
    if(err){
         console.log('Erorr http ' + err);
    }else{
        console.log('server running port 2000');
    }
});
/**
 * Koneksi ke mongodb
 */

var databaseUrl = "angularmobile", // "username:password@example.com/mydb"
    collections = ["user","message"],
    db = require("mongojs").connect(databaseUrl, collections);


io.on('connection', function(socket){
    console.log('client connected', socket.id);
    /**
     * Event registrasi, saat pengguna pertama kali menggunakan aplikasi
     *
     */
    socket.on('registration', function(message, callback){
        var response    = {};
        // cek terlebih dahulu apakah ada email yang sama
        db.user.find({email: message['email']}, function(error, users){
            if(error){
                response['error']       = 'Pengguna belum terdaftar';
                callback(response);
            }else if(users.length > 0){
                response['error']       = 'Sudah ada pengguna dengan email tersebut';
                callback(response);
            }else{
                message['socketid']        = '';
                message['friends']         = [];
                message['penddingrequest'] = [];
                message['friendrequest']   = [];

                db.user.save(message,function(error, user){
                    if(error){
                        response['error']       = 'Error pada sisi server';
                        console.log(error);
                    }else{
                        response['userid']      = user['_id'];
                    }
                    callback(response);
                });
            }
        });
    });
    /**
     * Event login, saat pengguna sudah terdaftar dan akan menggunakan aplikasi
     */
    socket.on('login', function(message, callback){
        var response    = {};

        db.user.find({email : message['email']}, function(error, users) {
            if(error){
                response['error']       = 'Pengguna tidak ditemukan';
                console.log(error);
            }else if(users.length == 0){
                response['error']       = 'Pengguna tidak ditemukan';
            }else{
                var user = users[0];
                // cek email dan password
                if(user['email'] != message['email']){
                    response['error']   = 'Pengguna tidak ditemukan';
                }else if(user['password'] != message['password']){
                    response['error']   = 'Password tidak sesuai';
                }else{
                   db.user.update({email: user['email']}, {$set: { socketid : socket.id}});
                   response['data'] = user;
                }
            }
            callback(response);
        });


    });
    /**
     * Event logout, saat pengguna keluar dari aplikasi,
     */
    socket.on('logout', function(message, callback){
        var response    = {};
        db.user.update({ _id: db.ObjectId(message['userid'])}, {$set: { socketid : ''}} , function(error,update){
            if(error && !update){
                response['error']       = 'Error system';
                console.log(error);
            }
            callback(response);
        });
    });
    /**
     * Event add friend, menbambahkan friend
     */
    socket.on('addfriend', function(message, callback){
        var response    = {};
        // cari user
        db.user.find({email: message['email']}, function(error, friend){
            if(error){
                response['error']       = 'Error system';
                console.log(error);
                callback(response);
            }else{
                if(friend.length > 0){
                    db.user.find({ _id: db.ObjectId(message['userid']) },function(error, user){
                     if(error){
                            response['error'] = error;
                        }else{
                            //update friend request ke teman yang di add
                            db.user.update({ email : friend[0]['email']} , {$addToSet : { friendrequest : { userid : user[0]['_id'], nama : user[0]['nama']}}} ,function(error , update){
                                if(error){
                                    response['error']       = 'Error pada saat update friend';
                                    console.log(error);
                                    callback(response);
                                }else{
                                    //kirim notif friend request ke teman yang di add
                                    if(friend[0]['socketid'] != ''){
                                        io.sockets.connected[friend[0]['socketid']].emit("friendrequest", { userid : user[0]['_id'] , nama : user[0]['nama']});// berjalan di socket.io => 1
                                    }
                                }
                            });
                            //update pendding request ke pengirim permintaan pertemanan
                            db.user.update({ email : user[0]['email']} , {$addToSet : { penddingrequest : { userid : friend[0]['_id'], nama : friend[0]['nama']}}} ,function(error , update){
                                if(error){
                                    response['error']       = 'Error pada saat pendding request';
                                    console.log(error);
                                    callback(response);
                                }else{
                                    response['data'] = { userid : friend[0]['_id'] , nama : friend[0]['nama']};
                                }
                                callback(response);
                            });
                        }
                    });
                }else{
                    response['error'] = 'User tidak ditemukan';
                    callback(response);
                }
            }
        });
    });
    /**
     * Event accept friend, menerima friend
     */
    socket.on('acceptfriend', function(message, callback){
        var response    = {};
        //update friends
        db.user.update({ _id: db.ObjectId(message['userid']) } , {$addToSet : { friends : { userid : message['useridaccept'], nama : message['usernameaccept'], ischat : false }}} ,function(error , update){
            if(error){
                response['error']       = 'Error system';
                console.log(error);
                callback(response);
            }else{
                //remove array penddingrequest by useridaccept
                db.user.update({ _id: db.ObjectId(message['userid'])} , { $pull : { friendrequest : { userid : db.ObjectId(message['useridaccept']) }}},function(error,updated){
                    if(error){
                        console.log(error);
                    }
                });
                //update friends
                db.user.update({ _id: db.ObjectId(message['useridaccept']) } , {$addToSet : { friends : { userid : message['userid'], nama : message['nama'], ischat : false }}} ,function(error , update){
                    if(error){
                        response['error']       = 'Error system';
                        console.log(error);
                        callback(response);
                    }else{
                        //remove array penddingrequest by useridaccept
                        db.user.update({ _id: db.ObjectId(message['useridaccept'])} , { $pull : { penddingrequest : { userid : db.ObjectId(message['userid']) }}},function(error,updated){
                            if(error){
                                console.log(error);
                            }else{
                                // cari scoket id untuk mengirimkan pesan
                                db.user.find({ _id: db.ObjectId(message['useridaccept']) },function(error, useraccept){
                                    //kirim notif accepeted
                                    io.sockets.connected[useraccept[0]['socketid']].emit("friendrequestaccepted",{namaaccepted : message['nama'] ,data :  useraccept[0]}); // berjalan di socket.io => 1
                                });
                            }
                        });
                        db.user.find({ _id: db.ObjectId(message['userid']) },function(error, useraccept){
                            //callback data user terbaru
                            response['data'] = useraccept[0];
                            callback(response);
                        });
                    }
                });
            }
        });
    });
    /**
     * Event message, saat pengguna mengirimkan pesan ke pengguna lain
     */
    socket.on('message', function(message, callback){
        var response    = {};

        db.message.save(message,function(error, message){
            db.user.find({ _id: db.ObjectId(message['to']) }, function(error, userto){
                console.log(userto);
                if(userto[0]['socketid'] == '' ){
                    response['error']       = userto[0]['nama']+' tidak terhubung ke server';
                    callback(response);
                }else{
                    io.sockets.connected[userto[0]['socketid']].emit("message", message); // berjalan di socket.io => 1
                    response['success'] = true;
                }
                callback(response);
            });
        });
    });
    /**
     * Event disconnect, saat pengguna tidak terhubung lagi ke server,
     */
    socket.on('disconnect', function(){
        console.log('event disconnect', socket.id);
        db.user.update({socketid : socket.id}, {$set: { socketid : ''}});
    });
});