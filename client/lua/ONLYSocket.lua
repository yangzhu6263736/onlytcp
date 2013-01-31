--[[
	onlytcp lua客户端
		因为发现luasocket receive(number)方式的一个奇惨问题 所以收数据改成了按行读取
]]
CONST_Socket_TickTime = 0.1--SOCKET接收信息轮训时间
CONST_Socket_ReconnectTime = 3--socket重连偿试时间时隔

CONST_HeartBeaT_TimeOuT = 15--socket心跳超时时间
CONST_HeartBeaT_SendTime = 10--socket心跳发送间隔
CONST_HeartBeaT_CheckTime = 20--socket心跳检查时间

packType_heartbeat = 1--心跳
packType_message = 2--信息包

local ONLYSocket = {}
ONLYSocket.__index = ONLYSocket
local lib = require "struct"
local JSON = require "cjson"

function ONLYSocket:new(host, port)  
    local o = oo or {} 
    setmetatable(o, self) 
    o.host = nil
    o.port = nil
	o.tickScheduler = nil--socket 消息接收定时器
	o.timeCheckScheduler = nil-- 心跳动超时检测定时器
	o.heartbeatScheduler = nil-- 心跳包定时发送定时器
	o.reconnectScheduler = nil-- 重连定时器
	o.lastHeartbeatTime = os.time()
	o.tcp = nil
	o.isRetryConnect = true
	o.delegate = nil
    return o  
end

-- 成员函数定义，要用 : 指定，才能用 self  
function ONLYSocket:connect(host, port)
	print(host, port)
	if host ~= nil then self.host = host end
	if port ~= nil then self.port = port end

	self.tcp = socket.tcp()
	self.tcp:settimeout(0.01)

	local response, status, partial = self.tcp:connect(self.host, self.port)
	print("response", response);
	print("status", status);
	print("partial", partial);
	if status ~= nil and response ~= 1 then
		self:onConnectFailure(status)
		return
	end
	self:onConnected()--连接成功

	local tick = function()
    	local subcontract = 2--封包方式 1为包头包体方式 2为\n方式
		while true do
			if subcontract == 2 then --2为\n方式
				local pool  = { self.tcp }
				rx, wr, er  = socket.select( pool, nil, 0.001 )
				if (er ~= nil) then break end;
				for n, sck in ipairs( rx ) do
					print("tick...")
					local body, status, partial = self.tcp:receive("*l")--读取包体
		    	    if status == "closed" then --如果读取失败 则跳出
			    		if self.tickScheduler ~= nil then
		    		 		CCDirector:sharedDirector():getScheduler():unscheduleScriptEntry(self.tickScheduler)--移除定时器
				    	end
				    	self.tcp:close();
				    	self:onDisconnect();
				   		break 
			    	end
				    if body == nil then break end
					local length = string.len(body);
					local packType = tonumber(string.sub(body, 1, 1));
					local message = string.sub(body, 2)
				    self:onPacket(packType, message)
				end
			else--1为包头包体方式 发现有奇怪异常
				local head, status, partial = self.tcp:receive(4)--读取四字节的包头
	    	    if status == "closed" then --如果读取失败 则跳出
		    		if self.tickScheduler ~= nil then
	    		 		CCDirector:sharedDirector():getScheduler():unscheduleScriptEntry(self.tickScheduler)--移除定时器
			    	end
			    	self.tcp:close();
			    	self:onDisconnect();
			   		break 
			    end 
			    print("head", head);
			    if head == nil then break end
			    if status == "timeout" then break end --如果读取失败 则跳出
				local _patten = "<i4"
			    local bodyLength = lib.unpack(_patten, head)
				
			    print("bodyLength", bodyLength);
				local body, status, partial = self.tcp:receive(bodyLength)--读取包体
				print("body", body);
				print("status", status);
				print("partial", partial);
			    --if body == nil then break end
				local _patten = "<i2c"..bodyLength - 2--两个字节的客户端事件 和N字节的包长
				local packType, message = lib.unpack(_patten, body)
			    self:onPacket(packType, message)
			end

		end
	end
	--开始读取TCP数据
	self.tickScheduler = CCDirector:sharedDirector():getScheduler():scheduleScriptFunc(tick, CONST_Socket_TickTime, false)
end

--设置委托对像
function ONLYSocket:setDelegate (delegate)
	self.delegate = delegate
end

--protocal
function ONLYSocket:onDisconnect()
	print("onDisconnect");
	CCDirector:sharedDirector():getScheduler():unscheduleScriptEntry(self.heartbeatScheduler)--移除定时器
	CCDirector:sharedDirector():getScheduler():unscheduleScriptEntry(self.timeCheckScheduler)--移除定时器
	self:_reconnect();
	self.delegate:onDisconnect();
end

--成功建立连接
function ONLYSocket:onConnected()
	print("ONLYSocket:onConnected")
	local _sendHeartbeat = function ()
		print("----send heart beat")
		self:sendStr(packType_heartbeat, '{}')
	end
	local _checkHeartBeat = function ()
		print("----_checkHeartBeat")
		if os.time() - self.lastHeartbeatTime > CONST_HeartBeaT_TimeOuT then
			print("心跳超时")
			self:_disconnect()
		end
	end
	self.heartbeatScheduler = CCDirector:sharedDirector():getScheduler():scheduleScriptFunc(_sendHeartbeat, CONST_HeartBeaT_SendTime, false)
	self.timeCheckScheduler = CCDirector:sharedDirector():getScheduler():scheduleScriptFunc(_checkHeartBeat, CONST_HeartBeaT_CheckTime, false)
	self.delegate:onConnected();
end

--连接失败
function ONLYSocket:onConnectFailure(status)
	print("ONLYSocket:onConnectFailure");
	self:_reconnect();
end
--收到服务端数据
function ONLYSocket:onPacket(packType, message)
	print("ONLYSocket:onPacket")
	self.lastHeartbeatTime = os.time()
	if packType == packType_heartbeat then --收到心跳包
		print("ClientEvent_heartbeat")
	else--收到数据包
		local pack = JSON.decode(message);
		self.delegate:onMessage(pack);
	end
end

--method
--断开连接 内部方法
function ONLYSocket:_disconnect()
	self.tcp:shutdown()
end

--用户主动退出
function ONLYSocket:disconnect()
	self:_disconnect()
	self.isRetryConnect = false--主动性断开不重连
end
--重连 
-- 非主动性断开3秒后重连 
--主动性断开不重连
function ONLYSocket:_reconnect()
	print("_reconnect")
	local _doReConnect = function ()
		CCDirector:sharedDirector():getScheduler():unscheduleScriptEntry(self.reconnectScheduler)--移除定时器
		self:connect()
	end
	if self.isRetryConnect == true then 
		self.reconnectScheduler = CCDirector:sharedDirector():getScheduler():scheduleScriptFunc(_doReConnect, CONST_Socket_ReconnectTime, false)
	end
end

--do send jsonstr
function ONLYSocket:sendStr(packType,  jsonStr)
	print("sendStr", packType, jsonStr)
	--local serverEvent = 9
	--防止socket中断了还发消息造成crash
	local bodylength = string.len(jsonStr) + 1
	local _patten = "<i4"
	local str = lib.pack(_patten, bodylength)
	self.tcp:send(str)
	local _patten = "<i1"
	local str = lib.pack(_patten, packType)
	self.tcp:send(str)
	local _patten = "<c"..string.len(jsonStr)
	local str = lib.pack(_patten, jsonStr)
	self.tcp:send(str)
end

--do send table
function ONLYSocket:send(serverLogicEvent, data)
	local _doSend = function ()
	end 	
		local _pack = {};
		local _params = {};
		_params['data'] = data;
		_pack[0] = serverLogicEvent;
		_pack[1] = _params;
		local _jsonStr = JSON.encode(_pack)
		self:sendStr(packType_message, _jsonStr)
	_doSend();
end

return ONLYSocket;




--CCDirector:sharedDirector():getScheduler():scheduleScriptFunc(test, 5, false)--10秒后退出
--testObj:connect('192,168.2.125', '7979')