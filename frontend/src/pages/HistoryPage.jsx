import { useState, useMemo } from 'react';
import {
    ArrowLeft, ChevronLeft, ChevronRight, Video,
    AlertTriangle, ZapOff, ShieldAlert, Pill, Activity,
    ChevronDown, ChevronUp, LayoutList, CalendarDays, Play
} from 'lucide-react';

// ── 날짜 유틸 ──
const today = new Date(2025, 4, 14);
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function dateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }

// ── 목업 데이터 ──
const RAW_DATA = {
    [dateStr(today)]:           { status:'normal',  summary:'안전하게 하루를 보내셨습니다.', hasVideo:true,  events:[{time:'08:12',type:'med',text:'아침 복약 완료'},{time:'10:34',type:'activity',text:'거실 TV 시청 중'},{time:'13:01',type:'med',text:'점심 복약 완료'},{time:'15:20',type:'activity',text:'소파에서 낮잠'}]},
    [dateStr(addDays(today,-1))]:{ status:'warning', summary:'낙상 감지 알림 발생. 자력 회복 확인.', hasVideo:true,  events:[{time:'07:55',type:'med',text:'아침 복약 완료'},{time:'14:22',type:'fall',text:'낙상 감지 알림 발생'},{time:'14:25',type:'activity',text:'자력으로 일어남 확인'},{time:'18:10',type:'med_miss',text:'저녁 복약 미완료'}]},
    [dateStr(addDays(today,-2))]:{ status:'caution', summary:'장시간 무동작 감지. 보호자 알림 전송.', hasVideo:true,  events:[{time:'09:00',type:'med',text:'아침 복약 완료'},{time:'11:30',type:'inactivity',text:'2시간 이상 무동작'},{time:'11:45',type:'alert',text:'보호자 알림 전송됨'},{time:'14:05',type:'activity',text:'활동 재개 확인'}]},
    [dateStr(addDays(today,-3))]:{ status:'normal',  summary:'이상 없이 안정적으로 지내셨습니다.', hasVideo:false, events:[{time:'08:30',type:'med',text:'아침 복약 완료'},{time:'12:00',type:'med',text:'점심 복약 완료'},{time:'19:30',type:'med',text:'저녁 복약 완료'}]},
    [dateStr(addDays(today,-4))]:{ status:'caution', summary:'점심 복약 1회 미완료 기록.', hasVideo:true,  events:[{time:'09:10',type:'med',text:'아침 복약 완료'},{time:'13:00',type:'med_miss',text:'점심 복약 미완료'},{time:'20:05',type:'med',text:'저녁 복약 완료'}]},
    [dateStr(addDays(today,-5))]:{ status:'normal',  summary:'평온하게 하루를 보내셨습니다.', hasVideo:true,  events:[{time:'08:00',type:'med',text:'아침 복약 완료'},{time:'11:00',type:'activity',text:'산책 30분'},{time:'18:00',type:'med',text:'저녁 복약 완료'}]},
    [dateStr(addDays(today,-6))]:{ status:'normal',  summary:'별 이상 없이 안전하셨습니다.', hasVideo:false, events:[{time:'08:20',type:'med',text:'아침 복약 완료'},{time:'13:30',type:'med',text:'점심 복약 완료'}]},
    [dateStr(addDays(today,-7))]:{ status:'warning', summary:'야간 무동작 3시간 이상 감지.', hasVideo:true,  events:[{time:'02:10',type:'inactivity',text:'야간 무동작 감지'},{time:'02:20',type:'alert',text:'보호자 알림 전송'},{time:'08:00',type:'activity',text:'기상 확인'}]},
    [dateStr(addDays(today,-8))]:{ status:'normal',  summary:'안전하게 지내셨습니다.', hasVideo:true,  events:[{time:'08:00',type:'med',text:'아침 복약 완료'},{time:'12:00',type:'med',text:'점심 복약 완료'}]},
    [dateStr(addDays(today,-9))]:{ status:'normal',  summary:'별 이상 없이 안전하셨습니다.', hasVideo:false, events:[{time:'08:30',type:'med',text:'아침 복약 완료'}]},
    [dateStr(addDays(today,-10))]:{ status:'caution', summary:'활동량이 평소보다 30% 감소.', hasVideo:true,  events:[{time:'10:00',type:'activity',text:'활동량 감소 감지'},{time:'18:00',type:'med',text:'저녁 복약 완료'}]},
    [dateStr(addDays(today,-11))]:{ status:'normal',  summary:'안정적인 하루.', hasVideo:true,  events:[{time:'08:00',type:'med',text:'아침 복약 완료'}]},
    [dateStr(addDays(today,-12))]:{ status:'normal',  summary:'이상 없이 지내셨습니다.', hasVideo:false, events:[{time:'09:00',type:'med',text:'아침 복약 완료'}]},
    [dateStr(addDays(today,-13))]:{ status:'normal',  summary:'안전하게 지내셨습니다.', hasVideo:true,  events:[{time:'08:10',type:'med',text:'아침 복약 완료'}]},
};

const EVENT_META = {
    med:       { color:'#7F77DD', bg:'#EEEDFE', Icon:Pill },
    med_miss:  { color:'#BA7517', bg:'#FAEEDA', Icon:Pill },
    fall:      { color:'#E24B4A', bg:'#FCEBEB', Icon:ShieldAlert },
    inactivity:{ color:'#BA7517', bg:'#FAEEDA', Icon:ZapOff },
    alert:     { color:'#BA7517', bg:'#FAEEDA', Icon:AlertTriangle },
    activity:  { color:'#1D9E75', bg:'#E1F5EE', Icon:Activity },
};

const STATUS_META = {
    normal:  { dot:'#1D9E75', badge:'#E1F5EE', text:'#0F6E56', label:'안전' },
    caution: { dot:'#EF9F27', badge:'#FAEEDA', text:'#854F0B', label:'주의' },
    warning: { dot:'#E24B4A', badge:'#FCEBEB', text:'#A32D2D', label:'위험' },
};

// ── 영상 모달 ──
function VideoModal({ dateKey, label, onClose }) {
    return (
        <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',flexDirection:'column',justifyContent:'flex-end',alignItems:'center'}}>
            <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.65)'}} onClick={onClose}/>
            <div style={{position:'relative',background:'#fff',borderRadius:'32px 32px 0 0',width:'100%',maxWidth:480,padding:'28px 24px 40px'}}>
                <div style={{width:48,height:6,borderRadius:3,background:'#e5e7eb',margin:'0 auto 20px'}}/>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
                    <div>
                        <p style={{fontSize:10,fontWeight:900,color:'#185FA5',textTransform:'uppercase',letterSpacing:2,margin:0}}>저장된 영상</p>
                        <p style={{fontSize:15,fontWeight:900,color:'#111',margin:'3px 0 0'}}>{label}</p>
                    </div>
                    <button onClick={onClose} style={{width:32,height:32,borderRadius:'50%',background:'#f3f4f6',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <ArrowLeft size={15}/>
                    </button>
                </div>
                <div style={{aspectRatio:'16/9',borderRadius:20,background:'#111827',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',marginBottom:16}}>
                    <button style={{width:60,height:60,borderRadius:'50%',background:'rgba(255,255,255,0.92)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Play size={24} color="#2563EB" fill="#2563EB" style={{marginLeft:3}}/>
                    </button>
                    <span style={{position:'absolute',bottom:12,right:12,fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.6)',background:'rgba(0,0,0,0.4)',padding:'2px 8px',borderRadius:10}}>24:00</span>
                    <span style={{position:'absolute',bottom:12,left:12,fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)'}}>{dateKey}</span>
                </div>
                <p style={{fontSize:10,fontWeight:900,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10}}>구간 선택</p>
                <div style={{display:'flex',gap:8}}>
                    {['00:00','06:00','12:00','18:00'].map((t,i)=>(
                        <button key={i} style={{padding:'8px 14px',borderRadius:12,fontSize:11,fontWeight:900,border:'none',cursor:'pointer',background:i===0?'#2563EB':'#f3f4f6',color:i===0?'#fff':'#6b7280'}}>{t}</button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── 타임라인 ──
function Timeline({ events }) {
    return (
        <div style={{position:'relative',paddingLeft:0}}>
            <div style={{position:'absolute',left:54,top:4,bottom:4,width:1,background:'#f3f4f6'}}/>
            {events.map((ev,i)=>{
                const m = EVENT_META[ev.type] || EVENT_META.activity;
                const Icon = m.Icon;
                return (
                    <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:i<events.length-1?14:0}}>
                        <span style={{width:40,fontSize:10,fontWeight:700,color:'#9ca3af',paddingTop:7,textAlign:'right',flexShrink:0}}>{ev.time}</span>
                        <div style={{width:28,height:28,borderRadius:'50%',background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative',zIndex:1}}>
                            <Icon size={13} color={m.color}/>
                        </div>
                        <p style={{fontSize:12,fontWeight:600,color:'#1f2937',margin:0,paddingTop:6,lineHeight:1.4}}>{ev.text}</p>
                    </div>
                );
            })}
        </div>
    );
}

// ── 일별: 풀 카드 (항상 펼침) ──
function DayCardFull({ dateKey, dayName, label, onPlayVideo }) {
    const data = RAW_DATA[dateKey];
    if (!data) return (
        <div style={{background:'#fff',border:'0.5px solid #e5e7eb',borderRadius:20,padding:'32px 20px',textAlign:'center'}}>
            <p style={{fontSize:13,color:'#9ca3af',margin:0}}>해당 날짜의 기록이 없습니다.</p>
        </div>
    );
    const s = STATUS_META[data.status];
    return (
        <div style={{background:'#fff',border:'0.5px solid #e5e7eb',borderRadius:20,overflow:'hidden'}}>
            <div style={{padding:'18px 20px 14px',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                    <div style={{width:12,height:12,borderRadius:'50%',background:s.dot,flexShrink:0,marginTop:3}}/>
                    <div>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                            <span style={{fontSize:13,fontWeight:900,color:'#374151'}}>{dayName}요일</span>
                            <span style={{fontSize:10,fontWeight:800,color:s.text,background:s.badge,padding:'2px 10px',borderRadius:20}}>{s.label}</span>
                        </div>
                        <p style={{fontSize:13,fontWeight:600,color:'#1f2937',margin:0,lineHeight:1.5}}>{data.summary}</p>
                    </div>
                </div>
                {data.hasVideo && (
                    <button onClick={()=>onPlayVideo(dateKey, label)} style={{width:36,height:36,borderRadius:'50%',background:'#EFF6FF',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <Video size={15} color="#1D4ED8"/>
                    </button>
                )}
            </div>
            <div style={{borderTop:'0.5px solid #f3f4f6',padding:'14px 20px 18px'}}>
                <p style={{fontSize:9,fontWeight:900,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.5,margin:'0 0 12px'}}>타임라인</p>
                <Timeline events={data.events}/>
            </div>
        </div>
    );
}

// ── 주별: 접기 가능한 카드 ──
function WeekCard({ weekDays, label, onPlayVideo }) {
    const [open, setOpen] = useState(false);
    const counts = {normal:0,caution:0,warning:0};
    weekDays.forEach(({dateKey})=>{
        const d = RAW_DATA[dateKey];
        if (d) counts[d.status]++;
    });
    const hasAlert = counts.warning > 0 || counts.caution > 0;

    return (
        <div style={{background:'#fff',border:'0.5px solid #e5e7eb',borderRadius:20,overflow:'hidden'}}>
            <div style={{padding:'16px 20px',cursor:'pointer'}} onClick={()=>setOpen(o=>!o)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                    <div>
                        <p style={{fontSize:10,fontWeight:900,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1.5,margin:0}}>{label}</p>
                        <p style={{fontSize:14,fontWeight:900,color:'#111827',margin:'3px 0 0'}}>
                            {hasAlert ? `이상 ${counts.warning+counts.caution}건 발생` : '이상 없이 안전한 주'}
                        </p>
                    </div>
                    {open ? <ChevronUp size={16} color="#9ca3af"/> : <ChevronDown size={16} color="#9ca3af"/>}
                </div>

                {/* 요일별 상태 바 */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:10}}>
                    {weekDays.map(({dateKey,dayName},i)=>{
                        const d = RAW_DATA[dateKey];
                        const color = !d ? '#e5e7eb' : STATUS_META[d.status].dot;
                        return (
                            <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                                <div style={{width:'100%',height:6,borderRadius:3,background:color}}/>
                                <span style={{fontSize:9,fontWeight:700,color:'#9ca3af'}}>{dayName}</span>
                            </div>
                        );
                    })}
                </div>

                {/* 통계 칩 */}
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[
                        {label:`안전 ${counts.normal}일`, color:'#0F6E56', bg:'#E1F5EE'},
                        {label:`주의 ${counts.caution}일`, color:'#854F0B', bg:'#FAEEDA'},
                        {label:`위험 ${counts.warning}일`, color:'#A32D2D', bg:'#FCEBEB'},
                    ].map((chip,i)=>(
                        <span key={i} style={{fontSize:10,fontWeight:800,color:chip.color,background:chip.bg,padding:'3px 10px',borderRadius:20}}>{chip.label}</span>
                    ))}
                </div>
            </div>

            {open && (
                <div style={{borderTop:'0.5px solid #f3f4f6',padding:'12px 12px',display:'flex',flexDirection:'column',gap:8}}>
                    {weekDays.map(({dateKey,dayName,label:dl},i)=>(
                        <DayCard key={i} dateKey={dateKey} dayName={dayName} label={dl} onPlayVideo={onPlayVideo}/>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── 주별 내부: 접기 가능한 소형 카드 ──
function DayCard({ dateKey, dayName, label, onPlayVideo }) {
    const [open, setOpen] = useState(false);
    const data = RAW_DATA[dateKey];
    if (!data) return (
        <div style={{background:'#f9fafb',border:'0.5px solid #e5e7eb',borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#d1d5db',flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:700,color:'#9ca3af'}}>{dayName} · 기록 없음</span>
        </div>
    );
    const s = STATUS_META[data.status];
    return (
        <div style={{background:'#f9fafb',border:'0.5px solid #e5e7eb',borderRadius:14,overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',cursor:'pointer'}} onClick={()=>setOpen(o=>!o)}>
                <div style={{width:8,height:8,borderRadius:'50%',background:s.dot,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                        <span style={{fontSize:11,fontWeight:900,color:'#374151'}}>{dayName}</span>
                        <span style={{fontSize:9,fontWeight:800,color:s.text,background:s.badge,padding:'1px 7px',borderRadius:20}}>{s.label}</span>
                    </div>
                    <p style={{fontSize:11,fontWeight:500,color:'#6b7280',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{data.summary}</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
                    {data.hasVideo && (
                        <button onClick={e=>{e.stopPropagation();onPlayVideo(dateKey,label);}}
                                style={{width:28,height:28,borderRadius:'50%',background:'#EFF6FF',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <Video size={12} color="#1D4ED8"/>
                        </button>
                    )}
                    {open ? <ChevronUp size={13} color="#9ca3af"/> : <ChevronDown size={13} color="#9ca3af"/>}
                </div>
            </div>
            {open && (
                <div style={{borderTop:'0.5px solid #e5e7eb',padding:'12px 16px'}}>
                    <Timeline events={data.events}/>
                </div>
            )}
        </div>
    );
}

// ── 메인 ──
export default function HistoryPage({ patient, onBack }) {
    const [viewMode, setViewMode] = useState('day');
    const [offset, setOffset] = useState(0);
    const [videoInfo, setVideoInfo] = useState(null);

    // 일별: offset = 며칠 전
    const currentDay = useMemo(()=>{
        const d = addDays(today, -offset);
        return { date:d, dateKey:dateStr(d), dayName:DAY_NAMES[d.getDay()] };
    }, [offset]);

    const dayLabel = offset===0?'오늘':offset===1?'어제':`${offset}일 전`;

    // 주별: offset = 몇 주 전 (일요일~토요일)
    const currentWeek = useMemo(()=>{
        const todayDow = today.getDay();
        const weekStart = addDays(today, -(todayDow + offset*7));
        return Array.from({length:7},(_,i)=>{
            const d = addDays(weekStart, i);
            const diff = Math.round((today-d)/86400000);
            const lbl = diff===0?'오늘':diff===1?'어제':diff<0?`${-diff}일 후`:`${diff}일 전`;
            return { date:d, dateKey:dateStr(d), dayName:DAY_NAMES[d.getDay()], label:lbl };
        });
    }, [offset]);

    const weekLabel = offset===0?'이번 주':offset===1?'지난 주':`${offset}주 전`;

    const navTitle = viewMode==='day'
        ? `${currentDay.date.getMonth()+1}월 ${currentDay.date.getDate()}일 (${currentDay.dayName})`
        : (()=>{ const s=currentWeek[0].date, e=currentWeek[6].date; return `${s.getMonth()+1}/${s.getDate()} — ${e.getMonth()+1}/${e.getDate()}`; })();

    const canNext = offset > 0;

    return (
        <div style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',background:'#F9FAFB',fontFamily:'sans-serif',paddingBottom:48}}>

            {/* 헤더 */}
            <div style={{background:'#2563EB',padding:'48px 20px 52px',borderRadius:'0 0 36px 36px'}}>
                <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:22}}>
                    <button onClick={onBack} style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.18)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <ArrowLeft size={18} color="#fff"/>
                    </button>
                    <div>
                        <p style={{fontSize:10,fontWeight:900,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:2,margin:0}}>History</p>
                        <p style={{fontSize:17,fontWeight:900,color:'#fff',margin:'2px 0 0'}}>{patient.name}님 기록</p>
                    </div>
                </div>

                {/* 통계 */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:22}}>
                    {[{label:'총 기록일',value:'14일'},{label:'이상 감지',value:'3건',alert:true},{label:'복약 준수율',value:'87%'}].map((s,i)=>(
                        <div key={i} style={{background:'rgba(255,255,255,0.14)',borderRadius:16,padding:'12px 8px',textAlign:'center'}}>
                            <p style={{fontSize:17,fontWeight:900,color:s.alert?'#FCA5A5':'#fff',margin:0}}>{s.value}</p>
                            <p style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.5)',margin:'3px 0 0'}}>{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* 뷰 토글 */}
                <div style={{display:'flex',background:'rgba(255,255,255,0.15)',borderRadius:14,padding:4}}>
                    {[{id:'day',label:'일별',Icon:LayoutList},{id:'week',label:'주별',Icon:CalendarDays}].map(({id,label,Icon})=>(
                        <button key={id} onClick={()=>{setViewMode(id);setOffset(0);}}
                                style={{flex:1,padding:'9px 0',borderRadius:10,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontWeight:900,fontSize:13,background:viewMode===id?'#fff':'transparent',color:viewMode===id?'#2563EB':'rgba(255,255,255,0.65)'}}>
                            <Icon size={15}/>{label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 네비게이터 */}
            <div style={{padding:'0 20px',marginTop:-18}}>
                <div style={{background:'#fff',border:'0.5px solid #e5e7eb',borderRadius:18,padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                    <button onClick={()=>setOffset(o=>o+1)}
                            style={{width:36,height:36,borderRadius:'50%',background:'#f3f4f6',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <ChevronLeft size={18} color="#6b7280"/>
                    </button>
                    <div style={{textAlign:'center'}}>
                        <p style={{fontSize:10,fontWeight:800,color:'#9ca3af',margin:0,textTransform:'uppercase',letterSpacing:1.5}}>{viewMode==='day'?dayLabel:weekLabel}</p>
                        <p style={{fontSize:15,fontWeight:900,color:'#111827',margin:'2px 0 0'}}>{navTitle}</p>
                    </div>
                    <button onClick={()=>canNext&&setOffset(o=>o-1)}
                            style={{width:36,height:36,borderRadius:'50%',background:canNext?'#f3f4f6':'transparent',border:'none',cursor:canNext?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',opacity:canNext?1:0.25}}>
                        <ChevronRight size={18} color="#6b7280"/>
                    </button>
                </div>

                {/* 일별 뷰 */}
                {viewMode==='day' && (
                    <DayCardFull
                        dateKey={currentDay.dateKey}
                        dayName={currentDay.dayName}
                        label={dayLabel}
                        onPlayVideo={(dk,lbl)=>setVideoInfo({dk,lbl})}
                    />
                )}

                {/* 주별 뷰 */}
                {viewMode==='week' && (
                    <WeekCard
                        weekDays={currentWeek}
                        label={weekLabel}
                        onPlayVideo={(dk,lbl)=>setVideoInfo({dk,lbl})}
                    />
                )}
            </div>

            {videoInfo && (
                <VideoModal dateKey={videoInfo.dk} label={videoInfo.lbl} onClose={()=>setVideoInfo(null)}/>
            )}
        </div>
    );
}