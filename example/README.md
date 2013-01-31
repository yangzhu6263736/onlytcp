OnlyTCP
=======

how to use onlytcp、

/**
 * Created with JetBrains WebStorm.
 * User: yangzhu
 * Date: 12-11-25
 * Time: 下午3:10
 * To change this template use File | Settings | File Templates.
 */
//require('v8-profiler');
require('./config/MyConst.js');//载入系统定义常量
require('./config/'+ENVIRONMENT+'/MyConfig.js');//载入应用配置
var ExBuffer = require('ExBuffer');
var Client = require('./Client');
var Manager = require('./manager');
var net = require('net');
var server = net.createServer();
var os = require('os');
server.listen(serverPort);
var manager = new Manager(server);

global.ENVIRONMENT = process.argv[2];//服务器运行环境 production development  s0001 用于载入对应的配置

var fpmMoudle = require("./fpmMoudle.js");
var _Common = require('./MyCommon.js');

fpmMoudle.init(FPMConfig);//fpm模块初始化
var mb = 1024 * 1024;
server.on('connection', function(socket) {
    console.log('系统内存' + os.freemem() / mb + 'MB');
    var client = new Client(server, socket);
    console.log('--- new connect --'+client.id);
    var _data = {
        code : "User_Not_Login",
        message :"hello world 扣",
        t:1359518999,
        a:"training",
        m:"startTraining"
    }
    var i = 1
    setInterval(function() {
        console.log("-----send test----");
        i++
        client.send(ClientEvent_BindUser,  _data);
    }, 10000);

    /**
     *	收到用户业务逻辑请求
     */
    client.on(ServerEvent_FPMLogicRequest, function (requestVO) {
        console.log('======socket on event RequestEvent_FPMLogicRequest======');
        if (!requestVO.s || !requestVO.a || !requestVO.m) return;//数据验证
        var _interfaceVO = {
            serverId : requestVO.s,//serverId
            action : requestVO.a,//action
            method : requestVO.m//method
        };
        fpmMoudle.doRequest(_interfaceVO, requestVO.data, function(_jsonStr){
            console.warn(process.pid +"=======fpm 数据返回成功 =========");
            if (_jsonStr) client.sendStr(ClientEvent_FPMLogicResult, _jsonStr);
        });
    });

    /**
     *  绑定SESSION
     */
    client.on(ServerEvent_BindUser, function (requestVO){
        console.log('======socket on event ServerEvent_BindUser======');
        var userVO = {
            'userId' : requestVO.data.cookieUserId,
            'cookieUserKey' : requestVO.data.cookieUserKey
        };
        server.manager.getClientByUserId(userVO.userId, function(error, oldClient){
            if (!error) return;
            if (oldClient.id && oldClient.id != client.id) {
                client.socket.destroy();
            }
        });
        client.set('userVO', userVO);
        server.manager.bindUser(userVO.userId, client.id);
        client.send(ClientEvent_BindUser, 'ServerEvent_heartbeat');
    });

    /**
     *	加入世界BOOS PK房间 收听boss相关信息
     */
    var roomMembers = {};
    client.on(ServerEvent_JoinRoom, function (requestVO) {
        console.log('======socket on event ServerEvent_JoinRoom======');
        switch (parseInt(requestVO.room)) {
            case RoomBoss:
                var _channelName = ChannelNameBoss + '_' + requestVO.s;
                console.log(_channelName);
                client.join(_channelName);
                var _resVO = {
                    'result' : {
                        'bossRes' : {}
                    }
                }
                var _interfaceVO = {
                    serverId : requestVO.s,//serverId
                    action : 'boss',//action
                    method : 'getTotalDamageUserNums'//method
                };
                try {
                    fpmMoudle.doRequest(_interfaceVO, {}, function(_jsonStr){
                        console.warn(process.pid +"=======取伤害过BOSS的人数 数据返回成功 =========");
                        if (_jsonStr) {
                            var res = JSON.parse(_jsonStr);
                            if (res['result']['nums'] != roomMembers[requestVO.s]) {
                                roomMembers[requestVO.s] = res['result']['nums'];
                                _resVO.result.bossRes[KBSPT_roomUserNumber] = res['result']['nums'];
                                mydo.doSendChatToLocalAll(_channelName, ClientEvent_SocketPush, _resVO);
                            }
                        }
                    });
                } catch (e){
                    console.log(e);
                    return;
                }

                break;
            case RoomDarts:
                var _channelName = ChannelNameDarts + '_' + requestVO.s;
                client.join(_channelName);
                break;
            case RoomStations:
                var _channelName = ChannelNameStations + '_' + requestVO.s;
                client.join(_channelName);
                break;
            /*公会BOSS房间*/
            case RoomUnionBoss:
                if (!requestVO.unionId) return;
                var _channelName = ChannelNameUnionBoss + '_' + requestVO.s + '_' + requestVO.unionId;
                console.log(_channelName);
                client.join(_channelName);
                var nums = server.manager.clients(_channelName).length;
                var _resVO = {
                    'result' : {
                        'unionBossRes' : {}
                    }
                }
                _resVO.result.unionBossRes[KBSPT_UnionBoss_roomUserNumber] = nums;
                mydo.doSendChatToLocalAll(_channelName, ClientEvent_SocketPush, _resVO);
                break;
            /*基础房间游戏PUSH*/
            case RoomBaseGamePush:
                var _channelName = ChannelBaseGamePush + '_' + requestVO.s;
                client.join(_channelName);
                console.log(_channelName);
                break;
        }
    });
    /**
     *	加入世界BOOS PK房间 收听boss相关信息
     */
    client.on(ServerEvent_LeaveRoom, function (requestVO) {
        console.log('======socket on event ServerEvent_leaveRoom======');
        switch (parseInt(requestVO.room))
        {
            case RoomBoss:
                var _channelName = ChannelNameBoss + '_' + requestVO.s;
                client.leave(_channelName);

                break;
            case RoomDarts:
                var _channelName = ChannelNameDarts + '_' + requestVO.s;
                client.leave(_channelName);
                break;
            case RoomStations:
                var _channelName = ChannelNameStations + '_' + requestVO.s;
                client.leave(_channelName);
                break;
            /*公会BOSS房间*/
            case RoomUnionBoss:
                var _channelName = ChannelNameUnionBoss + '_' + requestVO.s + '_' + requestVO.unionId;
                console.log(_channelName);
                client.leave(_channelName);
                var nums = server.manager.clients(_channelName).length;
                var _resVO = {
                    'result' : {
                        'unionBossRes' : {}
                    }
                }
                _resVO.result.unionBossRes[KBSPT_UnionBoss_roomUserNumber] = nums;
                mydo.doSendChatToLocalAll(_channelName, ClientEvent_SocketPush, _resVO);
                break;
            case RoomBaseGamePush:
                var _channelName = ChannelBaseGamePush + '_' + requestVO.s;
                client.leave(_channelName);
                break;
        }
    });

    client.on('disconnect', function(){

        console.log(this.id + 'disconnect');
        this.server.manager.delClient(this.id);
        this.allJoinedRooms().forEach(function(roomName){//移除用户加入的所有房间
            server.manager.leave(client.id, roomName);
        });
        this.get('userVO', function(userVO){
            if (userVO.userId) server.manager.removeBind(userVO.userId);
        });

        this.removeAllListeners();
        this.clear();
        console.log('系统内存' + os.freemem() / mb + 'MB');

//        var diff = hd.end();
//        console.info(diff);
//        console.log(this);
    });

    /**
     **	收到主进程传来的消息
     ** 		跨服通信
     */
    process.on('message', function(_pushVO){
        console.log(process.pid + 'push message');
        if (_pushVO.toUserId == 0) {
            mydo.doSendChatToLocalAll(_pushVO.channelName, ClientEvent_SocketPush, _pushVO);
        } else {
            mydo.doSendToLocal(_pushVO.channelName, _pushVO.toUserId, ClientEvent_SocketPush, _pushVO);
        }
    });

    mydo = {
        /*向主进程发送消息*/
        toMaster:function(_act, _data){
            var _proMsg = {
                'act': _act,
                'data': _data
            };
            process.send(_proMsg);
        },
        /**
         *	向本地客户端群发消息
         */
        doSendChatToLocalAll:function(_channelName, clientEvent, _packet){
            console.log(process.pid + 'doSendChatToLocalAll:' + _channelName);
            server.manager.clients(_channelName).forEach(function(clientId){
                server.manager.getClientByClientId(clientId, function(error, client){
                    if (error) client.send(clientEvent, _packet);
                })
            })
        },
        /*
         **	执行向本地发送
         **		toUserId:收信人
         **		clientEvent:客户端将触发的事件
         **		packet:发送的数据 一般为各种固定格式的VO
         */
        doSendToLocal:function(_channelName, toUserId, clientEvent, _packet){
            console.log(process.pid + 'doSendToLocal:' + _channelName);
            server.manager.getClientByUserId(toUserId, function(error, client){
                if (error) client.send(clientEvent, _packet);
            });
        }
    };
});

//setInterval(function(){
//    var num = 0;
//    for (var clientId in server.manager._clients) {
//        num++;
//    }
//    console.log(server.manager);
//    console.log('共持有客户端:' + num);
//    console.log('系统内存' + os.freemem() / mb + 'MB');
//    var util = require('util');
//
//    console.log(util.inspect(process.memoryUsage()));
//}, 10000);
