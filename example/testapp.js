/**
 * Created with JetBrains WebStorm.
 * User: yangzhu
 * Date: 12-11-25
 * Time: 下午3:10
 * To change this template use File | Settings | File Templates.
 */
//var Client = require('./Client');
//var Manager = require('./manager');
var Only = require("onlytcp");
var net = require('net');
var server = net.createServer();
server.listen(serverPort);
var manager = new Only.Manager(server);

server.on('connection', function(socket) {
    var client = new Only.Client(server, socket);
    console.log('--- new connect --'+client.id);
    /**
     *	收到用户业务逻辑请求
     */
    client.on(ServerEvent_FPMLogicRequest, function (requestVO) {
        console.log('======socket on event RequestEvent_FPMLogicRequest======');
    });

    /**
     *	加入世界BOOS PK房间 收听boss相关信息
     */
    client.on(ServerEvent_JoinRoom, function (requestVO) {
        console.log('======socket on event ServerEvent_JoinRoom======');
        client.join(_channelName);
        client.leave(_channelName);
    });
    

    client.on('disconnect', function(){
        console.log(this.id + 'disconnect');
        this.server.manager.delClient(this.id);
        this.allJoinedRooms().forEach(function(roomName){//移除用户加入的所有房间
            server.manager.leave(client.id, roomName);
        });
        this.removeAllListeners();
        this.clear();
    });


    mydo = {
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
