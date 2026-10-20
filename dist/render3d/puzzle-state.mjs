// Render state is derived from the same occupancy rules as the puzzle engines.
export function fixtureActive(game,s,{n,role,kind,id}){
 if(kind==='goal'||kind==='access')return s.p[role]===n;
 if(kind==='dock')return s.boxes.includes(n);
 if(game.puzzle){if(kind==='socket')return game.puzzle.socketOn(id.toLowerCase());if(kind==='target')return game.puzzle.delivered;return !!game.puzzle.plateOn[id.toLowerCase()]}
 return role===undefined?s.p.includes(n)||s.boxes.includes(n):s.p[role]===n;
}
export const symbol=id=>({sun:'☀',moon:'☾'}[id]||String(id).toUpperCase());
export function gateLabel(game,g){
 if(g.all)return g.all.map(symbol).join('+');
 if(g.rule?.lamps)return '●○';
 if(g.rule?.latch&&g.controls?.length)return g.controls.map(symbol).join('+');
 if(g.label)return g.label.replace(' 或 ','/').replace(' · 影门','');
 if(game.puzzle&&g.id==='seal')return game.puzzle.index===0?'A+B':'A/◆';
 return (g.controls?.length?g.controls.map(symbol).join('+'):symbol(g.id));
}
