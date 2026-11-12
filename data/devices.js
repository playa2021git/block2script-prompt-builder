// Catalogue facts are separate from UI and prompt generation. See docs/device-support.md.
export const GUIDE = 'https://playa2021git.github.io/reinvent-device-guide/';
const pin = (key,label,allowed=['P0','P1','P2']) => ({key,label,kind:'pin',allowed,required:true,sharing:'exclusive'});
const builtin = (id,name,group,description,opcode,extra={}) => ({id,name,group,builtIn:true,connection:'micro:bit内蔵',fields:[],description,status:'source',support:'Microbit Moreに対応命令あり（実機確認は別途必要）',opcode,...extra});
const external = (id,name,group,description,connection,fields,opcode,extra={}) => ({id,name,group,builtIn:false,connection,fields,description,status:'conditional',support:'汎用の入出力命令あり。装置の配線・電源・動作は先生と確認',opcode,...extra});
export const DEVICES = [
 builtin('buttons','A・Bボタン','S','ボタンが押されたことを調べる。','isButtonPressed'),
 builtin('touch','タッチロゴ','S','金色のロゴに触れたことを調べる。','whenTouchEvent',{note:'micro:bit V2の機能です。'}),
 builtin('light','明るさセンサ','S','まわりの明るさを調べる。','getLightLevel'),
 builtin('temperature','温度センサ','S','本体の温度を調べる。','getTemperature'),
 builtin('microphone','マイク','S','音の大きさを調べる。音の種類を見分けるAIとは別です。','getSoundLevel',{note:'micro:bit V2の機能です。'}),
 builtin('accelerometer','加速度センサ（X・Y・Z）','S','傾き・揺れ・動きを調べる。','getAcceleration'),
 builtin('compass','コンパス／磁気','S','方角や磁気を調べる。','getCompassHeading / getMagneticForce'),
 external('pir','人感センサ HC-SR505','S','人などが動いたことを調べる。','デジタル入力',[pin('signal','信号（OUT）')],'isPinHigh'),
 external('soil','土壌水分センサ','S','土の湿り具合を数字で調べる。','アナログ入力',[pin('signal','信号（アナログ）')],'getAnalogValue'),
 external('distance','超音波距離センサ HC-SR04','S','物までの距離を調べる。','TRIG・ECHOの2本',[pin('trig','TRIG（合図を送る）'),pin('echo','ECHO（反射を受け取る）')],null,{status:'unverified',support:'B2Sで距離をcmで得る手順は未確認',note:'教材のSonar拡張はMakeCode用です。Microbit Moreのパルス機能と同じものとは判断しません。電圧や接続回路も確認してください。'}),
 external('scale','重量センサ','S','載せたものの重さをgで調べる。','Grove・I2C（2本の通信線を使う接続）',[
 {key:'scl',label:'SCL（クロック）',kind:'fixed',value:'P19',sharing:'i2c'},
 {key:'sda',label:'SDA（データ）',kind:'fixed',value:'P20',sharing:'i2c'},
 ],'getDataLabeled / sendData',{support:'Grove Shieldの配線・電源を先生と確認',note:'重さは通信ラベル「weight」で受け取ります。',memoPlaceholder:'例：水皿を載せて、皿と水を合わせた重さを測る。'}),
 builtin('led','5×5 LED','A','micro:bitの画面に文字やマークを出す。','displayMatrix / displayText'),
 builtin('speaker','スピーカー','A','音を鳴らして知らせる。','playTone / stopTone',{note:'本体スピーカーはmicro:bit V2の機能です。'}),
 external('servo','180°サーボモータ（SG90）','A','決めた角度まで動かす。','サーボ信号',[pin('signal','信号（サーボ）')],'setServo',{note:'電源とGNDの接続も先生と確認してください。'}),
 external('vibrator','振動モータ','A','振動の強さを変えて知らせる。','Grove Shield・PWM（P14・P15・P16）',[pin('signal','信号（PWM）',['P14','P15','P16'])],'setAnalogOut'),
 external('pump','デジタルマイクロポンプ','A','水や空気を送る。','Grove・デジタル出力',[pin('signal','信号（ON・OFF）',['P0','P1','P2'])],'setDigitalOut',{note:'教材のポンプ用モジュールを想定しています。ポンプ本体を端子へ直結せず、Grove Shieldの実際の信号ピン・電源を確認してください。動かす時間と停止条件も決めましょう。'})
];
export const AI_MODES = {
 none:{name:'使わない'},
 image:{name:'画像認識',support:'TM2Scratchに画像モデルURL・ラベル・イベントの命令あり。'},
 sound:{name:'音声認識',support:'TM2Scratchに音声モデルURL・ラベル・イベントの命令あり。学校端末のマイクで確認してください。'},
 pose:{name:'ポーズ認識',support:'Teachable Machineのポーズ分類モデルのB2S連携は未確認。PoseNet2Scratchの姿勢検出を同じ対応とは扱いません。'}
};
export const findDevice = id => DEVICES.find(d=>d.id===id);
