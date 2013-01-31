
local NTSocketClient = {}
local this = NTSocketClient;--指定this关键字到对像本身

--内部私有变量
local _host = nil
local _port = nil
local _cookieUserId = nil
local _cookieUserKey = nil
local _serverId = nil
local _delegate = nil

local _socket = nil

local ONLYSocket = require('classes.ONLYSocket');

--常量配置
local ServerEvent_FPMLogicRequest = 1;--请求类型 服务端FPM逻辑请求事件
local ServerEvent_JoinRoom = 2;--加入世界BOSS房间 参与PK 接收消息
local ServerEvent_LeaveRoom = 3;--离开世界BOSS房间
local ServerEvent_BindUser = 4;--将客户端对像与用户帐号绑定

local ClientEvent_FPMLogicResult = 1;--请求类型 客户端逻辑返回事件
local ClientEvent_SocketPush = 2;--请求类型 服务端主动推送
local ClientEvent_BindUser = 4;--用户绑定成功


NTSocketClient.connect = function (host, port, cookieUserId, cookieUserKey, serverId, delegate)
	if host ~= nil then _host = host end
	if port ~= nil then _port = port end
	if delegate ~= nil then _delegate = delegate end
	if serverId ~= nil then _serverId = serverId end
	if cookieUserId ~= nil then _cookieUserId = cookieUserId end
	if cookieUserKey ~= nil then _cookieUserKey = cookieUserKey end
	_socket = ONLYSocket:new(_host, _port)
	_socket:setDelegate(this);
	_socket:connect(host, port);
end

--protocal ONLYSocket委托方法
NTSocketClient.onConnected = function ()
	print("NTSocketClient.onConnected");
	this.doBindUser();
end

NTSocketClient.onDisconnect = function ()
	print("NTSocketClient.onDisconnect");
end
--收到数据包 根本事件分发数据
NTSocketClient.onMessage = function (pack)
	print("NTSocketClient.onMessage", pack);
	local ClientEvent = pack[0];
	local data = pack[1];
	if ClientEvent == ClientEvent_BindUser then
		this.onBinded(data);
	elseif ClientEvent == ClientEvent_SocketPush then
		this.onSocketPush(data);
	elseif ClientEvent == ClientEvent_FPMLogicResult then
		this.onLogicResult(data);
	end
end

--逻辑事件
--用户绑定成功
NTSocketClient.onBinded = function ()
	print("NTSocketClient.onBinded", pack);
	--_delegate.onConnected();
end

--逻辑请求返回
NTSocketClient.onLogicResult = function (data)
	print("NTSocketClient.onLogicResult", data);
end

--服务端主动推送
NTSocketClient.onSocketPush = function (data)
	print("NTSocketClient.onSocketPush", data);
end

--执行绑定用户
NTSocketClient.doBindUser = function ()
	print("doBindUser")
	local params = {}
	params['cookieUserId'] = _cookieUserId;
	params['cookieUserKey'] = _cookieUserKey;
	_socket:send(ServerEvent_BindUser, params);
end

--用户操作断开
NTSocketClient.doDisconnect = function ()
	print("NTSocketClient.doDisconnect")
	_host = nil
	_port = nil
	_cookieUserId = nil
	_cookieUserKey = nil
	_serverId = nil
	_delegate = nil
	if _socket ~= nil then
		_socket:disconnect();
		_socket = nil
	end
end

NTSocketClient.connect('192.168.2.125', 7979, 1, 'cookieUserKey', 1, nil)


--CCDirector:sharedDirector():getScheduler():scheduleScriptFunc(NTSocketClient.doDisconnect, 15, false)--10秒后退出
--testObj:connect('192,168.2.125', '7979')