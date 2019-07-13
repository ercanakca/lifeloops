var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 20020;
var request = require('request');

var axios = require('axios')

var headers = {};
var baseUrl = "http://46.20.1.120:4444";

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {

    console.log('Yeni Kullanıcı Bağlandı 1 -- ' + socket.id);

    socket.on('chat-create', function (data) {

        console.log('Chat isteği geldi-- ' + socket.id);

        const url = baseUrl + '/api/chat-create';

        const options = {
            method: 'POST',
            headers: {'content-type': 'application/json', 'Authorization': 'bearer ' + data['token']},
            data: {'token': data['token'], 'to_user_id': data['to_user_id']},
            url,
        };

        axios(options).then(function (response) {

            // console.log('  1-- '+response.data.status);
            // console.log('  2-- '+response.data.result.chat_id);
            // console.log('  3-- '+response.data.result.user_id);
            // console.log('  4-- '+response.data.result.to_user_id);
            // console.log('  5-- '+response.data.message);

            if (response.data.status == true) {
                io.emit(response.data.result.chat_id, {
                    user_id: response.data.result.user_id,
                    to_user_id: response.data.result.to_user_id
                });
                console.log(response.data.result.chat_id, {
                    user_id: response.data.result.user_id,
                    to_user_id: response.data.result.to_user_id
                });

            } else {
                console.log('error!');
            }

        }).catch(function (error) {
            console.log(error);
        });
    });

    socket.on('message-send', function (data) {

        console.log('mesaj isteği geldi-- ' + socket.id);

        const url = baseUrl + '/api/message-send';

        const options = {
            method: 'POST',
            headers: {'content-type': 'application/json', 'Authorization': 'bearer ' + data['token']},
            data: {
                'token': data['token'],
                'chat_id': data['chat_id'],
                'data_type': data['data_type'],
                'content': data['content'],
                'latitude': data['latitude'],
                'longitude': data['longitude'],
            },
            url,
        };

        axios(options).then(function (response) {

            io.emit(response.data.result.chat_id, {
                data_type: response.data.result.data_type,
                receiver: response.data.result.receiver,
                sender: response.data.result.sender,
                content: response.data.result.content,
                latitude: response.data.result.latitude,
                longitude: response.data.result.longitude,
            });

            console.log(response.data.result.chat_id, {
                data_type: response.data.result.data_type,
                receiver: response.data.result.receiver,
                sender: response.data.result.sender,
                content: response.data.result.content,
                latitude: response.data.result.latitude,
                longitude: response.data.result.longitude,
            })

        }).catch(function (error) {
            console.log(error);
        });

    });

    socket.on('last-geo-update', function (data) {

        console.log('geo update isteği geldi -- ' + socket.id);

        const url = baseUrl + '/api/last-geo-update';

        const options = {
            method: 'POST',
            headers: {'content-type': 'application/json', 'Authorization': 'bearer ' + data['token']},
            data: {
                'token': data['token'],
                'latitude': data['latitude'],
                'longitude': data['longitude'],
                'battery': data['battery'],
                'time': data['time'],
            },
            url,
        };

        axios(options).then(function (response) {

            if(response.data.status == true){

                console.log(response.data.result.user_id, {
                    latitude: response.data.result.latitude,
                    longitude: response.data.result.longitude,
                    battery: response.data.result.battery,
                    time: response.data.result.time,
                });

                //to_user_ids ???

                io.emit(response.data.result.user_id, {
                    latitude: response.data.result.latitude,
                    longitude: response.data.result.longitude,
                    battery: response.data.result.battery,
                    time: response.data.result.time,
                });

            }

        }).catch(function (error) {
            console.log(error);
        });
    });

    socket.on('location-follow', function (data) {

        console.log('follow isteği geldi -- ' + socket.id);

        const url = baseUrl + '/api/location-follow';

        const options = {
            method: 'POST',
            headers: {'content-type': 'application/json', 'Authorization': 'bearer ' + data['token']},
            data: {
                'token': data['token'],
                'environment_id': data['environment_id'],
                    'latitude': data['latitude'],
                    'longitude': data['longitude'],
                    'battery': data['battery'],
                    'last_time': data['last_time'],
            },
            url,
        };

        axios(options).then(function (response) {

            if(response.data.status == true){

                for (let r=0; r < response.data.result.length; r++){

                    console.log('environment_' + response.data.result[r].environment_id, {
                        user_id: response.data.result[r].user_id,
                        latitude: response.data.result[r].latitude,
                        longitude: response.data.result[r].longitude,
                        battery: response.data.result[r].battery,
                        last_time: response.data.result[r].last_time,
                    })

                }

            }

            // io.emit(response.data.result.chat_id, {
            //     data_type: response.data.result.data_type,
            //     receiver: response.data.result.receiver,
            //     sender: response.data.result.sender,
            //     content: response.data.result.content,
            //     latitude: response.data.result.latitude,
            //     longitude: response.data.result.longitude,
            // });


        }).catch(function (error) {
            console.log(error);
        });
    });

    socket.on('connect', function (data) {

        console.log('Yeni Kullanıcı Bağlandı 2 -- ' + data['token']);

    });

    socket.on('disconnect', function (data) {

        console.log('Kullanıcı Çıkış Yaptı ' + socket.id);

    });

});

http.listen(port, function () {
    console.log('listening on *:' + port);
});
