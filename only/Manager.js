exports = module.exports = Manager;
function Manager(server){
    this._nowClientId = 1;
    this.server = server;
    this._clients = {};//所有客户端对像存放池
    this._clientKV = {};//客户端ID与用户ID KV对照池
    this._rooms = [];//房间列表
    this._roomClients = {};//房间客户端

    server.manager = this;
}
/*取得客户端ID号 根据当前号生成一个数字与SOCKET对应*/
Manager.prototype.getClientId = function(){
    this._nowClientId++;
    return this._nowClientId + 100000000;
};

/**
 *  设置客户端列表
 * @param clientId
 * @param client
 */
Manager.prototype.setClient = function(clientId, client)
{
    this._clients[clientId] = client;
};

/**
 *  删除客户端
 * @param clientId
 */
Manager.prototype.delClient = function(clientId)
{
    delete this._clients[clientId];
}

/**
 *  加入房间
 * @param clientId
 * @param roomName
 * @param fn
 */
Manager.prototype.join = function(clientId, roomName){
    var index = this._rooms.indexOf(roomName);
    if (index < 0) {
        this._rooms.push(roomName);
        this._roomClients[roomName] = [];
    }
    var index = this._roomClients[roomName].indexOf(clientId);
    if (index < 0) this._roomClients[roomName].push(clientId);
};

/**
 *  离开房间
 * @param clientId
 * @param roomName
 * @param fn
 */
Manager.prototype.leave = function (clientId, roomName)
{
    if (!this._roomClients[roomName]) return;
    var index = this._roomClients[roomName].indexOf(clientId);
    if (index >= 0) this._roomClients[roomName].splice(index, 1);
    if (this._roomClients.length == 0) {
        var index = this._rooms.indexOf(roomName);
        this._rooms.splice(index, 1);
    }
};

/**
 *  某房间的所有客户端列表
 * @param roomName
 */
Manager.prototype.clients = function (roomName){
    return this._roomClients[roomName] ? this._roomClients[roomName] : [];
};
/**
 *  根据ID取得客户端对像
 * @param clientId
 * @return {*}
 */
Manager.prototype.getClientByClientId = function (clientId, fn) {
    var error = false;
    if (fn && this._clients.hasOwnProperty(clientId)) {
        fn(true, this._clients[clientId]);
    } else {
        fn(false, null);
    }
};

/**
 *  根据用户ID取得客户端对像
 * @param userId
 * @param fn
 */
Manager.prototype.getClientByUserId = function (userId, fn)
{
    var error = false;
    if (!this._clientKV.hasOwnProperty(userId)) {
        if (fn) fn(error, null);
        return;
    }
    var _clientId = this._clientKV[userId];
    if (!this._clients.hasOwnProperty(_clientId)) {
        if (fn) fn(error, null);
        return;
    }
    if (fn) fn(true, this._clients[_clientId]);
    return;
};

/**
 *  将用户ID与客户端对像ID绑定
 * @param userId
 * @param clientId
 */
Manager.prototype.bindUser = function(userId, clientId)
{
    this._clientKV[userId] = clientId;
};

/**
 *  移除用户的绑定
 * @param userId
 */
Manager.prototype.removeBind = function(userId)
{
    delete this._clientKV[userId];
};