(function(root){'use strict';
class Game{
 constructor(entry){this.entry=entry;this.puzzle=new EchoReplay.Puzzle(entry.replayIndex);const l=this.puzzle.level,w=l.map[0].length,idx=p=>p.y*w+p.x;this.level={...entry,w,h:l.map.length,floor:l.map.flat().join(''),goals:[idx(l.exit),-1],trails:[],trailIndex:new Map(),trailAll:0,docks:[],plates:l.plates.map(p=>({...p,pos:idx(p),role:p.role==='body'?0:p.role==='echo'?1:undefined})),gates:l.gates.flatMap(g=>g.cells.map(p=>({...g,pos:idx(p)})))};this.queue=[];this.history=[]}
 get state(){const p=this.puzzle,w=this.level.w;return {p:[p.player.y*w+p.player.x,p.ghost?p.ghost.y*w+p.ghost.x:-1],boxes:[],ink:0,moves:p.moves,active:0,latched:[]}}
 get notice(){return this.puzzle.notice}set notice(v){this.puzzle.notice=v}
 get won(){return this.puzzle.mode==='won'}
 step(d){return !!EchoSync.DIR[d]&&this.puzzle.tick(EchoSync.DIR[d])}
 tick(){return false} // Rendering/elapsed time cannot advance either actor.
 wait(){return this.puzzle.wait()}

 record(){this.queue=[];this.puzzle.record()}
 replay(){this.queue=[];return this.puzzle.replay()}
 undo(){return this.replay()}
 openGate(g){return this.puzzle.gateOpen(g.id)}
 navigate(x,y){const p=this.puzzle;if(!['recording','playing'].includes(p.mode)||p.paused)return false;const next=p.pathTo(x,y)[0];return next?p.tick([next.x-p.player.x,next.y-p.player.y]):false}

}
root.EchoReplayGame=Game;if(typeof module!=='undefined'&&module.exports)module.exports=Game;
})(globalThis);
