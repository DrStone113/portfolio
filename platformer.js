// ── PIXEL ADVENTURE PLATFORMER OVERLAY ──────────────────────────
(function () {
  const BASE = 'assets/images/';
  function enc(s) { return s.replace(/ /g,'%20').replace(/\(/g,'%28').replace(/\)/g,'%29'); }
  function loadImg(src) {
    return new Promise(r => { const i=new Image(); i.onload=()=>r(i); i.onerror=()=>r(null); i.src=src; });
  }
  function rnd(a,b) { return a+Math.random()*(b-a); }
  function pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

  const D=48, SRC=32, G=900, SPD=105, ANIM_FPS=20;
  const NAMES=['Pink Man','Ninja Frog','Mask Dude','Virtual Guy'];

  // ── CANVAS ──────────────────────────────────────────────────────
  const cv=document.createElement('canvas');
  // pointer-events:auto on canvas so we can grab characters
  // but pass-through clicks to page when not over a character
  cv.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;image-rendering:pixelated;cursor:default;';
  document.body.appendChild(cv);
  const ctx=cv.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  function resize(){ cv.width=window.innerWidth; cv.height=window.innerHeight; }
  resize(); window.addEventListener('resize',resize);

  // ── DRAG SYSTEM ─────────────────────────────────────────────────
  let dragged=null;       // currently dragged Char
  let dragOffX=0,dragOffY=0;
  // Velocity history for throw (last N mouse positions)
  const velHistory=[];
  const VEL_SAMPLES=6;
  let lastMX=0,lastMY=0,lastMT=0;

  function getPointer(e){
    const t=e.touches?e.touches[0]:e;
    return {x:t.clientX,y:t.clientY};
  }

  function hitTest(chars,px,py){
    // Find topmost character under pointer
    for(let i=chars.length-1;i>=0;i--){
      const c=chars[i];
      if(px>=c.x&&px<=c.x+D&&py>=c.y&&py<=c.y+D) return c;
    }
    return null;
  }

  function onPointerDown(e){
    if(!window._pfChars) return;
    const {x,y}=getPointer(e);
    const hit=hitTest(window._pfChars,x,y);
    if(!hit) return;
    e.preventDefault(); e.stopPropagation();
    dragged=hit;
    dragged.grabbed=true;
    dragged.vx=0; dragged.vy=0;
    dragged.mode='grabbed';
    dragged.showThought('😲',1.5);
    dragOffX=x-hit.x; dragOffY=y-hit.y;
    velHistory.length=0;
    lastMX=x; lastMY=y; lastMT=performance.now();
    cv.style.cursor='grabbing';
  }

  function onPointerMove(e){
    if(!dragged) {
      // Change cursor when hovering over a character
      if(window._pfChars){
        const {x,y}=getPointer(e);
        const hit=hitTest(window._pfChars,x,y);
        cv.style.pointerEvents=hit?'auto':'none';
        cv.style.cursor=hit?'grab':'default';
      }
      return;
    }
    e.preventDefault();
    const {x,y}=getPointer(e);
    dragged.x=x-dragOffX;
    dragged.y=y-dragOffY;
    dragged.prevY=dragged.y; // keep prevY in sync so no phantom landing

    // Track velocity
    const now=performance.now();
    const dt=(now-lastMT)/1000||0.016;
    velHistory.push({vx:(x-lastMX)/dt, vy:(y-lastMY)/dt, t:now});
    if(velHistory.length>VEL_SAMPLES) velHistory.shift();
    lastMX=x; lastMY=y; lastMT=now;
  }

  function onPointerUp(e){
    if(!dragged) return;
    e.preventDefault();
    // Average recent velocity for throw
    if(velHistory.length>0){
      const recent=velHistory.slice(-3);
      dragged.vx=recent.reduce((s,v)=>s+v.vx,0)/recent.length;
      dragged.vy=recent.reduce((s,v)=>s+v.vy,0)/recent.length;
      // Cap throw speed
      const spd=Math.sqrt(dragged.vx**2+dragged.vy**2);
      const maxSpd=1800;
      if(spd>maxSpd){ dragged.vx=dragged.vx/spd*maxSpd; dragged.vy=dragged.vy/spd*maxSpd; }
    }
    dragged.grabbed=false;
    dragged.onGround=false;
    // Lock facing to throw direction — don't flip mid-air
    // Facing set by throw direction — drag will naturally slow vx
    if(dragged.vx>8)  dragged.facing=1;
    if(dragged.vx<-8) dragged.facing=-1;
    dragged.mode='wander'; dragged.modeT=rnd(1,2);
    if(Math.sqrt(dragged.vx**2+dragged.vy**2)>600)
      dragged.showThought(pick(['😵','💫','woah!','🌀']),1.5);
    dragged=null;
    cv.style.cursor='default';
    cv.style.pointerEvents='none';
  }

  cv.addEventListener('mousedown',  onPointerDown, {passive:false});
  cv.addEventListener('touchstart',  onPointerDown, {passive:false});
  window.addEventListener('mousemove', onPointerMove, {passive:false});
  window.addEventListener('touchmove',  onPointerMove, {passive:false});
  window.addEventListener('mouseup',   onPointerUp,   {passive:false});
  window.addEventListener('touchend',   onPointerUp,   {passive:false});

  // ── PLATFORMS (one-way top surface only) ────────────────────────
  const SELS=['.demo-nav','h2','.char-card','.feature-item',
    '.screen-mockup','.fruit-item','footer','.tech-stack-list',
    '.pixel-chars-grid','.demo-hero-content'];
  function scanPlatforms(){
    const list=[];
    list.push({x:-500,y:window.innerHeight-2,w:window.innerWidth+1000,h:4});
    SELS.forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>{
        const r=el.getBoundingClientRect();
        if(r.width<40||r.height<8) return;
        if(r.bottom<-60||r.top>window.innerHeight+60) return;
        list.push({x:r.left,y:r.top,w:r.width,h:r.height});
      });
    });
    return list;
  }

  // ── SCROLL EFFECT ────────────────────────────────────────────────
  // Track scroll delta — when page scrolls down, platforms move up in viewport
  // Characters standing on platforms should "fall" as platform moves away
  let lastScrollY = window.scrollY;
  let scrollDelta = 0; // positive = scrolled down (platforms moved up)

  window.addEventListener('scroll', () => {
    const newScrollY = window.scrollY;
    scrollDelta = newScrollY - lastScrollY;
    lastScrollY = newScrollY;
  }, { passive: true });
  const sheets={};
  async function loadSheets(){
    for(const name of NAMES){
      const [idle,run,jump,fall]=await Promise.all([
        loadImg(BASE+enc('Main Characters/'+name+'/Idle (32x32).png')),
        loadImg(BASE+enc('Main Characters/'+name+'/Run (32x32).png')),
        loadImg(BASE+enc('Main Characters/'+name+'/Jump (32x32).png')),
        loadImg(BASE+enc('Main Characters/'+name+'/Fall (32x32).png')),
      ]);
      sheets[name]={idle,run,jump,fall};
    }
  }

  // ── CHARACTER ───────────────────────────────────────────────────
  class Char {
    constructor(name,x,y){
      this.name=name; this.x=x; this.y=y;
      this.vx=SPD*(Math.random()>.5?1:-1); this.vy=0;
      this.prevY=y; this.onGround=false;
      this.facing=this.vx>0?1:-1;
      this.frame=0; this.frameT=0; this.state='idle';

      // AI
      this.mode='wander'; this.modeT=rnd(2,4);
      this.jumpCD=0;          // cooldown between jumps
      this.actionCD=0;        // cooldown between random actions (dir flip, etc.)
      this.target=null; this.targetCD=0;
      this.stuckX=x; this.stuckT=0;

      // Thought bubble
      this.thought=null; this.thoughtT=0; this.thoughtAlpha=0;
    }
    get cx(){ return this.x+D/2; }
    get bottom(){ return this.y+D; }

    showThought(text,dur){
      this.thought=text; this.thoughtT=dur||2.5; this.thoughtAlpha=0;
    }

    pickTarget(platforms){
      const above=platforms.filter(p=>{
        const dy=this.y-p.y, dx=Math.abs(this.cx-(p.x+p.w/2));
        return dy>D+8&&dy<900&&dx<700&&p.w>50;
      });
      if(!above.length) return null;
      above.sort((a,b)=>{
        const sa=(this.y-a.y)-Math.abs(this.cx-(a.x+a.w/2))*0.5;
        const sb=(this.y-b.y)-Math.abs(this.cx-(b.x+b.w/2))*0.5;
        return sb-sa;
      });
      return above[0];
    }

    update(dt,platforms){
      // Skip all AI/physics while being dragged
      if(this.grabbed){
        this.state='fall'; // fall sprite while held
        this.frameT+=dt;
        if(this.frameT>=1/ANIM_FPS){this.frameT-=1/ANIM_FPS;this.frame=(this.frame+1)%1;}
        return;
      }

      // Timers
      this.modeT    =Math.max(0,this.modeT-dt);
      this.jumpCD   =Math.max(0,this.jumpCD-dt);
      this.actionCD =Math.max(0,this.actionCD-dt);
      this.targetCD =Math.max(0,this.targetCD-dt);
      this.thoughtT =Math.max(0,this.thoughtT-dt);

      // Thought fade
      if(this.thought){
        if(this.thoughtT>1.0) this.thoughtAlpha=Math.min(1,this.thoughtAlpha+dt*5);
        else this.thoughtAlpha=Math.max(0,this.thoughtAlpha-dt*4);
        if(this.thoughtT<=0){this.thought=null;this.thoughtAlpha=0;}
      }

      // Stuck detection
      if(this.onGround){
        if(Math.abs(this.x-this.stuckX)<2) this.stuckT+=dt;
        else{this.stuckT=0;this.stuckX=this.x;}
      } else {this.stuckT=0;this.stuckX=this.x;}

      // Mode switch
      if(this.modeT<=0){
        const roll=Math.random();
        const prev=this.mode;
        if     (roll<0.28) this.mode='climb';
        else if(roll<0.50) this.mode='wander';
        else if(roll<0.65) this.mode='rest';
        else if(roll<0.80) this.mode='think';
        else               this.mode='look';
        this.modeT=rnd(2.5,6);
        this.target=null;
        // Show thought on mode change
        if(this.mode==='think'&&!this.thought) this.showThought(pick(['🤔','hmm...','💭','...?']),3);
        if(this.mode==='rest' &&!this.thought) this.showThought(pick(['zzz','😴','💤','~']),3);
        if(this.mode==='climb'&&!this.thought) this.showThought(pick(['!','⬆️','🏃','let\'s go']),1.8);
        if(this.mode==='look' &&!this.thought) this.showThought(pick(['👀','?','hmm']),2);
      }

      // Stuck recovery
      if(this.stuckT>1.5&&this.mode!=='rest'&&this.mode!=='think'){
        this.vx=-this.vx||SPD;
        if(this.onGround&&this.jumpCD<=0){
          this.vy=-Math.sqrt(2*G*140); this.jumpCD=1.5;
        }
        this.stuckT=0; this.mode='wander'; this.modeT=rnd(1,2);
      }

      // ── BEHAVIOR ──────────────────────────────────────────────
      // AI applies acceleration (force), not direct velocity set.
      // This lets throw momentum carry naturally — AI just nudges.
      const accel = this.onGround ? dt * 800 : dt * 120; // weaker air control

      switch(this.mode){

        case 'wander':
          // Nudge toward walk speed
          if(Math.abs(this.vx)<SPD) this.vx+=Math.sign(this.vx||1)*accel;
          if(this.onGround&&this.jumpCD<=0&&Math.random()<0.005){
            this.vy=-rnd(280,440); this.jumpCD=rnd(2.5,4.5);
          }
          if(this.actionCD<=0&&Math.random()<0.008){
            this.vx=-this.vx; this.actionCD=rnd(1.5,3);
          }
          break;

        case 'climb':{
          if(!this.target||this.targetCD<=0){
            this.target=this.pickTarget(platforms); this.targetCD=0.5;
          }
          if(!this.target){this.mode='wander';this.modeT=1;break;}
          const tp=this.target;
          const dx=(tp.x+tp.w/2)-this.cx;
          const dy=this.y-tp.y;
          // Accelerate toward target X
          const wantVx=Math.sign(dx)*Math.min(SPD*1.4,Math.abs(dx)*4+20);
          const climbAccel=this.onGround?dt*1200:dt*200;
          this.vx+=(wantVx-this.vx)*Math.min(1,climbAccel);
          const aligned=Math.abs(dx)<tp.w*0.65;
          if(aligned&&dy>8&&this.onGround&&this.jumpCD<=0){
            this.vy=-Math.sqrt(2*G*(dy+D+20))*1.2;
            this.jumpCD=rnd(1.0,1.8);
          }
          if(this.onGround&&this.cx>tp.x&&this.cx<tp.x+tp.w&&
             Math.abs(this.bottom-tp.y-D)<16){
            this.target=null;
            this.showThought(pick(['✅','😊','👍','⭐','nice!']),2);
            this.mode=pick(['wander','rest','think']); this.modeT=rnd(2,5);
          }
          break;
        }

        case 'rest':
          // Friction handled by drag above — just don't add force
          break;

        case 'think':
          if(this.actionCD<=0&&Math.random()<0.015){
            this.facing=-this.facing; this.actionCD=rnd(0.8,2);
          }
          break;

        case 'look':
          if(Math.abs(this.vx)<SPD*0.35)
            this.vx+=Math.sign(this.vx||1)*accel*0.4;
          if(this.actionCD<=0&&Math.random()<0.012){
            this.facing=-this.facing; this.actionCD=rnd(0.6,1.5);
          }
          break;
      }

      // ── SCROLL EFFECT ──────────────────────────────────────────
      if(scrollDelta > 6 && this.onGround) {
        this.vy = -Math.min(scrollDelta * 4, 300);
        this.onGround = false;
        if(scrollDelta > 15) this.showThought(pick(['😱','!','whoa','💨']), 1.2);
      }

      // ── PHYSICS ──────────────────────────────────────────────
      // Air drag: horizontal velocity decays when airborne → throw arc feels natural
      // Ground friction: stronger deceleration when on ground
      const drag = this.onGround ? Math.pow(0.001, dt) : Math.pow(0.55, dt);
      this.vx *= drag;

      this.vy=Math.min(this.vy+G*dt,800);
      const newX=this.x+this.vx*dt;
      const newY=this.y+this.vy*dt;

      // ── ONE-WAY COLLISION (top surface only) ─────────────────
      // prevY tracks character's Y last frame — platform top is from getBCR (current viewport)
      const prevBottom=this.prevY+D;
      this.prevY=this.y; // update BEFORE resolving so next frame has correct prev
      this.onGround=false;
      let ry=newY;

      for(const p of platforms){
        const cx=newX+D/2;
        const cb=ry+D;
        // Land: moving down, horizontally inside, crossed top surface this frame
        // Use generous threshold (16px) to handle fast scroll/movement
        if(this.vy>=0&&
           cx>p.x+2&&cx<p.x+p.w-2&&
           prevBottom<=p.y+16&&
           cb>=p.y){
          ry=p.y-D; this.vy=0; this.onGround=true;
        }
      }

      this.x=newX; this.y=ry;
      if(this.x+D<0)          this.x=window.innerWidth;
      if(this.x>window.innerWidth) this.x=-D;
      if(this.y>window.innerHeight+120){this.y=30;this.vy=0;}

      // Facing follows velocity — drag makes it turn gradually, not snap
      if(this.vx>8)  this.facing=1;
      if(this.vx<-8) this.facing=-1;

      // Sprite state
      if     (this.vy<-60)          this.state='jump';
      else if(this.vy>60)           this.state='fall';
      else if(Math.abs(this.vx)>12) this.state='run';
      else                          this.state='idle';

      this.frameT+=dt;
      const fc=this.state==='run'?12:this.state==='idle'?11:1;
      if(this.frameT>=1/ANIM_FPS){this.frameT-=1/ANIM_FPS;this.frame=(this.frame+1)%fc;}
    }

    draw(ctx){
      const s=sheets[this.name]; if(!s) return;
      const img=({idle:s.idle,run:s.run,jump:s.jump,fall:s.fall})[this.state]||s.idle;
      if(!img) return;
      ctx.save();
      if(this.facing<0){
        ctx.translate(this.x+D,this.y); ctx.scale(-1,1);
        ctx.drawImage(img,this.frame*SRC,0,SRC,SRC,0,0,D,D);
      } else {
        ctx.drawImage(img,this.frame*SRC,0,SRC,SRC,this.x,this.y,D,D);
      }
      ctx.restore();

      // Grab highlight — glow ring when being dragged
      if(this.grabbed){
        ctx.save();
        ctx.strokeStyle='rgba(255,255,100,0.85)';
        ctx.lineWidth=2.5;
        ctx.shadowColor='rgba(255,255,0,0.6)';
        ctx.shadowBlur=10;
        ctx.beginPath();
        ctx.ellipse(this.x+D/2,this.y+D*0.55,D*0.42,D*0.48,0,0,Math.PI*2);
        ctx.stroke();
        ctx.restore();
      }

      // ── THOUGHT BUBBLE ──────────────────────────────────────
      if(this.thought&&this.thoughtAlpha>0.05){
        const bx=this.x+D/2, by=this.y-18;
        ctx.save();
        ctx.globalAlpha=this.thoughtAlpha;
        ctx.font='bold 12px sans-serif';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        const tw=ctx.measureText(this.thought).width;
        const bw=tw+18, bh=22;
        // Shadow
        ctx.shadowColor='rgba(0,0,0,0.2)'; ctx.shadowBlur=6;
        // Bubble
        ctx.fillStyle='rgba(255,255,255,0.95)';
        ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.roundRect(bx-bw/2,by-bh/2,bw,bh,9);
        ctx.fill(); ctx.stroke();
        // Tail
        ctx.shadowBlur=0;
        ctx.beginPath();
        ctx.moveTo(bx-5,by+bh/2); ctx.lineTo(bx+5,by+bh/2); ctx.lineTo(bx,by+bh/2+8);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Text
        ctx.fillStyle='#1a1a2e';
        ctx.shadowBlur=0;
        ctx.fillText(this.thought,bx,by);
        ctx.restore();
      }
    }
  }

  // ── BOOT ────────────────────────────────────────────────────────
  loadSheets().then(()=>{
    const chars=NAMES.map((name,i)=>new Char(
      name,
      60+i*Math.floor(window.innerWidth/5),
      window.innerHeight*0.4-i*60
    ));
    window._pfChars=chars; // expose for drag hit-test
    let last=0;
    function loop(ts){
      const dt=Math.min((ts-last)/1000,0.05); last=ts;
      ctx.clearRect(0,0,cv.width,cv.height);
      const platforms=scanPlatforms();
      chars.forEach(c=>{c.update(dt,platforms);c.draw(ctx);});
      scrollDelta=0;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
})();
