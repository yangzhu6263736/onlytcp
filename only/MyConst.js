/*前后端常量定义*/
global.KresWelcome = 6;//欢迎信息

global.PackType_HeartBeat = 1;//心跳包
global.PackType_Message = 2;//信息包

//以下定义s:server{服务端包定义} p:packetType｛包类型｝
//KBSPT K BOSS SERVER PACK TYPE服务端世界BOSS包类型
global.KBSPT_userListChange = 1;//用户列表变化
global.KBSPT_bossInfoChange = 2;//生命值变化
global.KBSPT_battle = 3;//发生的战斗
global.KBSPT_roomUserNumber = 5;//房间中的用户数量

global.KBSPT_UnionBoss_roomUserNumber = 5;//房间中的用户数量

global.ServerEvent_FPMLogicRequest = 1;//请求类型 服务端FPM逻辑请求事件
global.ServerEvent_JoinRoom = 2;//加入世界BOSS房间 参与PK 接收消息
global.ServerEvent_LeaveRoom = 3;//离开世界BOSS房间
global.ServerEvent_BindUser = 4;//将客户端对像与用户帐号绑定

global.ClientEvent_FPMLogicResult = 1;//请求类型 客户端逻辑返回事件
global.ClientEvent_SocketPush = 2;//请求类型 服务端主动推送
global.ClientEvent_BindUser = 4;//用户绑定成功

global.IPC_Master_Act_Watchchannel = 1;//进程通讯 关注频道
global.IPC_Master_Act_Leavechannel = 2;//进程通讯 退出关注频道

global.RoomBoss = 1;
global.RoomDarts = 2;
global.RoomStations = 3;
global.RoomUnionBoss = 4;//联盟BOSS
global.RoomBaseGamePush = 5;//游戏推送房间

global.ChannelNameBoss = 'WorldBossChannel';//世界BOSS频道名 最终组合出的频道名为 WorldBossChannel_1
global.ChannelNameDarts = 'DartsChannel';//运镖频道名
global.ChannelNameStations = 'StationsChannel';//佣兵驻地频道
global.ChannelNameUnionBoss = 'RoomUnionBossChannel';//联盟BOSS频道
global.ChannelBaseGamePush = 'RoomBaseGamePush';//游戏基础push
