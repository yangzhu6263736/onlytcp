var ExBuffer = require('ExBuffer'),
    EventEmitter = process.EventEmitter;
require('./MyConst.js');//载入系统定义常量

exports = module.exports = Client;
/**
 * Socket constructor.
 *
 * @param {Manager} manager instance
 * @param {String} session id
 * @param {Namespace} namespace the socket belongs to
 * @param {Boolean} whether the
 * @api public
 */

function Client (server, socket) {
    this.id = server.manager.getClientId();
    server.manager.setClient(this.id, this);
    var _client = this;
    this.socket = socket;
    this.server = server;
    this.data = {};//存放用户session数据
    this.userRooms = [];//用户加入的房间
    var exBuffer = new ExBuffer().uint32Head().littleEndian();
    exBuffer.on('data', function(buffer){
//        console.log('onReceivePackData');
//        console.log(buffer);
        var _packType = buffer.readUInt8(0);
        switch (_packType) {
            case PackType_HeartBeat:
                console.log('收到心跳包');
                _client.send(PackType_HeartBeat, '');
                break;
            default ://数据包
                try{
                    var _pack = JSON.parse(buffer.slice(1).toString());
                    var _event = _pack[0];
                    var _params = _pack[1];
                    _client.emit(_event, _params);
                } catch(e) {
                    console.log(e);
                    console.log('json数据不能解析');
                    return;
                }
                break;
        }
    });
    socket.exBuffer = exBuffer;

    socket.on('data', function(data) {
        this.exBuffer.put(data);//只要收到数据就往ExBuffer里面put
    });

    socket.on('close', function(){
        console.log('disconnect');
        _client.emit('disconnect', _client);
        socket.destroy();
        socket.removeAllListeners();
    });
    socket.setTimeout(30000);
    socket.setKeepAlive(true, 50);
    socket.on('timeout', function() {
        console.log('timeOut');
        socket.destroy();
    });
    this.on('error', defaultError);
};

var defaultError = function () {};

Client.prototype.__proto__ = EventEmitter.prototype;
Client.prototype.$emit = EventEmitter.prototype.emit;

/**
 *  客户端加入房间
 * @param roomName
 */
Client.prototype.join = function(roomName){
    this.server.manager.join(this.id, roomName);
    this.userRooms.push(roomName);
};
/**
 *  客户端离开房间
 * @param roomName
 */
Client.prototype.leave = function (roomName) {
    this.server.manager.leave(this.id, roomName);
    var index = this.userRooms.indexOf(roomName);
    if (index >= 0) this.userRooms.splice(index, 1);//移除用户加入的房间
};

/**
 * 取得用户所有已加入的房间
 * @return {Array}
 */
Client.prototype.allJoinedRooms = function (){
    return this.userRooms;
};

/**
 * 为客户端持有数据
 */
Client.prototype.set = function(key, data, fn){
    this.data[key] = data;
    if (fn) fn(true);
};

/**
 * 取出客户端对像持有的数据
 * @param key
 * @param fn
 */
Client.prototype.get = function(key, fn){
    if (this.data[key] && fn) fn(this.data[key]);
};

/**
 * 删除用户session数据
 * @param key
 */
Client.prototype.del = function(key){
    delete this.data[key];
};
/**
 * 像客户端发送字符串
 * @param clientEvent
 * @param jsonStr
 * @param fn
 */

Client.prototype.sendStr = function (packType, jsonStr, fn) {
    if (this.socket.writable == false) return;
    if (!jsonStr) return;
    if (!packType) return;
    subcontract = 2;//封包方式 1为包头包体方式 2为\n方式
    if (subcontract == 1) {//包头包体方式分包
        var len = Buffer.byteLength(jsonStr);
        /*发送4字节32位的包头*/
        var headBuf = new Buffer(4);    //写入4个字节 32位整型表示本次包长
        headBuf.writeUInt32LE(len + 2, 0)//包体+客户端事件类型
        console.log("bodylength"+ len);
        console.log(jsonStr);
        this.socket.write(headBuf);
        /*发送1字节8位的客户端事件类型*/
        var clientEventBuf = new Buffer(2);
        clientEventBuf.writeUInt16LE(clientEvent, 0);
        this.socket.write(packType);

        /*发送包内容*/
        var bodyBuf = new Buffer(len);
        bodyBuf.write(jsonStr);
        this.socket.write(bodyBuf);
    } else {//\n分包
        var body = packType + jsonStr + "\n";
        var bodyBuf = new Buffer(Buffer.byteLength(body));
        bodyBuf.write(body);
        this.socket.write(bodyBuf);
    }

    if (fn) {
        fn();
    }
};

/**
 * 清理该客户数据
 */
Client.prototype.clear = function(){
    delete this.data;
    delete this.userRooms;
};

/**
 *  向客户端发送JSON对像
 * @param clientEvent
 * @param data
 * @param fn
 */
Client.prototype.send = function (packType, clientEvent, params, fn) {
    console.log('send to client');
    var pack = {
        '0'   :  clientEvent,
        '1'   :  params
    };
    var jsonStr = JSON.stringify(pack);
    this.sendStr(packType, jsonStr, fn)
};
