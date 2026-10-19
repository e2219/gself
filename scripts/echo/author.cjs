// Authored layouts and deterministic solution search. This script is not shipped in the app.
const fs=require('fs'),E=require('../../dist/echo/engine.js');
const room=()=>['#######','#.....#','#.....#','#.....#','#.....#','#.....#','#######'];
const hall=()=>['#######','#######','#######','#.....#','#######','#######','#######'];
const board=(map,start,goal,extra={})=>({map,start,goal,...extra});
const maze=(walls)=>{const m=room().map(s=>s.split(''));for(const [x,y]of walls)m[y][x]='#';return m.map(r=>r.join(''));};
const mines=(cells,bombs)=>({cells,bombs,clues:room().flatMap((row,y)=>[...row].flatMap((c,x)=>c==='#'||cells.some(p=>p[0]===x&&p[1]===y)?[]:cells.some(p=>Math.abs(p[0]-x)<=1&&Math.abs(p[1]-y)<=1)?[[x,y]]:[]))});
const line5=Array.from({length:5},(_,i)=>[i+1,3]);
const t9=Array.from({length:9},(_,i)=>[i%3+1,Math.floor(i/3)+1]);
const square=['#######','#...###','#...###','#...###','#######','#######','#######'];
const L=[];function add(title,kind,rule,hint,boards,transform='same'){L.push({id:L.length+1,title,kind,rule,hint,transform,boards});}
add('同一拍','同步入门','一次方向输入，两位旅人同时走一格。一起停在各自的归航环。','向右前进，观察两个自己始终同时行动。',[board(hall(),[1,3],[5,3]),board(hall(),[1,3],[5,3])]);
add('借墙错位','同步入门','一侧遇墙会停住，另一侧仍可走。利用墙壁改变相对位置。','先靠近右墙，让影子先停下，再一起向左调整。',[board(hall(),[1,3],[3,3]),board(hall(),[3,3],[4,3])]);
add('隔岸开门','同步入门','金色月台可由旅人或箱子压住。另一侧的同字母门在下一步开放。','先让本体站到 A，再沿墙调整影子。门按本回合开始时的供能状态判断。',[board(room(),[1,3],[5,5],{plates:[{id:'A',at:[3,3]}]}),board(maze([[3,1],[3,2],[3,4],[3,5]]),[1,3],[5,5],{gates:[{id:'A',at:[3,3],actor:0,plate:[3,3]}]})]);
add('镜中的方向','同步入门','本关影子的左右方向相反，上下相同。预览箭头会显示各自方向。','向右时，本体向右，影子向左；遇墙仍可各自停下。',[board(hall(),[1,3],[5,3]),board(hall(),[5,3],[1,3])],'mirrorX');
add('第一枚月箱','推箱供能','只能推、不能拉。将月箱推到金色方形底座，再让两人归航。','别把箱子推向墙角。到达底座后绕到旁边继续走。',[board(room(),[1,3],[5,3],{boxes:[[3,3]],docks:[[4,3]]}),board(room(),[1,3],[5,3])]);
add('留出身位','推箱供能','推箱前，要先站到箱子的另一侧。撤销会同时恢复两边。','把左右身位留出来，先规划每一箱最后一次推动的方向。',[board(maze([[3,1],[3,5]]),[1,3],[5,3],{boxes:[[3,2],[3,4]],docks:[[4,2],[4,4]]}),board(maze([[2,2],[4,4]]),[1,3],[5,3])]);
add('箱子替你守门','推箱供能','箱子也能压住 A。供能交给箱子，本体才能离开月台。','箱子到 A 后不要再把它推走；绕开箱子，让影子通过。',[board(room(),[1,3],[5,1],{boxes:[[3,3]],docks:[[4,3]],plates:[{id:'A',at:[4,3]}]}),board(maze([[3,1],[3,2],[3,4],[3,5]]),[1,3],[5,1],{gates:[{id:'A',at:[3,3],actor:0,plate:[4,3]}]})]);
add('镜像货仓','推箱供能','两侧都要推箱归位，影子左右反向。不要只顾一侧。','把每次左右推动对另一侧的影响一起考虑；贴墙能暂时固定一位旅人。',[board(maze([[1,1],[5,5]]),[2,4],[5,2],{boxes:[[3,3]],docks:[[4,2]]}),board(maze([[5,1],[1,5]]),[4,4],[1,2],{boxes:[[3,3]],docks:[[2,2]]})],'mirrorX');
add('数字会说话','数字排雷','数字表示周围八格的雷数。点问号标雷，再按「确认排雷」开放安全格。','0 周围都安全。只剩一个未知邻格的 1，指向唯一雷位。',[board(room(),[1,1],[5,5],{mines:mines([[2,3],[3,3],[4,3]],[[3,3]])}),board(room(),[1,1],[5,5])]);
add('一一二一一','数字排雷','全部雷位都能由数字推断，不需要猜。未确认前，问号格不能走。','比较相邻数字覆盖的区域；中间的 2 与两侧的 1 可以排除多余格。',[board(room(),[1,1],[5,5],{mines:mines(line5,[[2,3],[4,3]])}),board(maze([[3,2],[3,4]]),[1,1],[5,5])]);
add('两岸的证词','数字排雷','两片遗迹都有独立数字。两侧都标记正确，排雷才会确认。','分别用每一侧的总雷数和数字推断；无需依靠另一侧猜测。',[board(room(),[1,1],[5,5],{mines:mines([[1,3],[2,3],[3,3],[4,3]],[[1,3],[4,3]])}),board(room(),[5,1],[1,5],{mines:mines([[2,3],[3,3],[4,3],[5,3]],[[2,3],[5,3]])})],'mirrorX');
add('穿过雷区的月箱','数字排雷','安全格开放后仍要规划推箱，标出的雷位永远不能通行。','先完成排雷，再从合适的一侧推动箱子穿过中间的安全缺口。',[board(room(),[1,1],[5,5],{mines:mines(line5,[[2,3],[4,3]]),boxes:[[3,2]],docks:[[3,4]]}),board(maze([[2,4],[4,2]]),[1,1],[5,5])]);
add('只走一次','一笔月纹','带细线的月纹格必须全部经过。离开后不能重返；原地被挡不算重复。','选好绕行方向，最后停在归航环；需要时可撤销。',[board(maze([[1,1],[4,2],[4,3],[1,3],[2,1],[3,1],[2,4],[3,4],[1,2]]),[2,2],[2,3],{trails:[[2,2],[3,2],[3,3],[2,3]]}),board(room(),[2,2],[2,3])]);
add('九格织月','一笔月纹','两侧九格都要一笔走完。终点的位置决定最后几步的走法。','把路线看作一条蛇形线，从终点倒推哪些格必须最后经过。',[board(square,[1,1],[3,3],{trails:t9}),board(square,[1,1],[3,3],{trails:t9})]);
add('错开的织纹','一笔月纹','两片月纹形状不同，某侧受阻可以帮助另一侧补全路线。','不要急着走向出口；先找只有一个邻格的尽头，它必须成为路线的端点。',[board(square,[1,1],[3,3],{trails:t9}),board(maze([[3,1],[3,2],[1,4],[2,4]]),[1,1],[3,3],{trails:[[1,1],[2,1],[2,2],[1,2],[1,3],[2,3],[3,3]]})]);
add('月箱与断桥','一笔月纹','月纹格离开后坍塌；推箱时也不能把箱子送进已坍塌的格子。','先考虑箱子到位之后，你还有没有路走；把折返安排在普通地面。',[board(room(),[1,3],[5,5],{boxes:[[3,3]],docks:[[4,3]],trails:[[2,2],[3,2],[4,2],[5,2],[5,3],[5,4]]}),board(maze([[2,2],[4,4]]),[1,3],[5,5])]);
add('门后还有门','综合遗迹','两个 A / B 电路交叉供能。箱子替一侧守住月台，再调整另一侧。','从最后一扇门倒推它需要哪个月台，给箱子安排长期供能的位置。',[board(maze([[4,5]]),[1,3],[5,5],{boxes:[[3,3]],docks:[[4,3]],plates:[{id:'A',at:[4,3]}],gates:[{id:'B',at:[5,4],actor:1,plate:[4,2]}]}),board(maze([[3,1],[3,2],[3,4],[3,5]]),[1,3],[5,5],{boxes:[[4,4]],docks:[[4,2]],plates:[{id:'B',at:[4,2]}],gates:[{id:'A',at:[3,3],actor:0,plate:[4,3]}]})]);
add('镜面雷仓','综合遗迹','镜像移动、数字排雷与双侧推箱同时存在。每一推都影响两岸。','先推断安全通道，再规划两箱的身位；利用墙壁抵消多余位移。',[board(room(),[1,1],[5,5],{mines:mines(line5,[[2,3],[4,3]]),boxes:[[3,2]],docks:[[3,4]]}),board(room(),[5,1],[1,5],{mines:mines(line5,[[2,3],[4,3]]),boxes:[[3,2]],docks:[[3,4]]})],'mirrorX');
add('不能回头的接力','综合遗迹','推箱供能与一次性月纹相连。错误的先后顺序会封住剩余路线。','让箱子稳定供电，再进入需要一笔完成的区域。普通格仍可用于调整影子。',[board(room(),[1,3],[5,5],{boxes:[[3,3]],docks:[[4,3]],plates:[{id:'A',at:[4,3]}],trails:[[2,2],[3,2],[4,2],[5,2],[5,3],[5,4]]}),board(maze([[3,1],[3,2],[3,4],[3,5]]),[1,3],[5,5],{gates:[{id:'A',at:[3,3],actor:0,plate:[4,3]}],trails:[[4,2],[5,2],[5,3],[4,3],[4,4],[5,4]]})]);
add('同归之约','综合遗迹','排雷、推箱、交叉供能与月纹在同一回合相遇。没有计时，只有次序。','先排雷，借月箱留住电源；走入月纹前，先看两位旅人的最终停靠位置。',[board(room(),[1,1],[5,5],{mines:mines([[1,3],[2,3]],[[1,3]]),boxes:[[3,2]],docks:[[4,2]],plates:[{id:'A',at:[4,2]}],trails:[[3,4],[4,4],[5,4],[5,5]]}),board(maze([[3,1],[3,2],[3,4],[3,5]]),[1,1],[5,5],{gates:[{id:'A',at:[3,3],actor:0,plate:[4,2]}],boxes:[[4,4]],docks:[[4,5]],trails:[[4,2],[5,2],[5,3],[5,4],[5,5]]})]);
let failed=false;const proofs=[];
for(const l of L){
 for(let i=0;i<2;i++)if(l.boards[i].mines){const sols=E.mineSolutions(l,i);if(sols.length!==1){console.log('AMBIGUOUS',l.id,i,sols.length);failed=true;}}
 const start=Date.now(),s=E.solve(l,650000);console.log(l.id,l.title,s?`${s.path.length} moves / ${s.visited} states / ${Date.now()-start}ms / ${s.path}`:'UNSOLVED');
 if(!s){failed=true;continue;}proofs.push({id:l.id,...s,flags:l.boards.map(b=>b.mines?.bombs||[])});
}
fs.writeFileSync('dist/echo/levels.js','(function(root){const levels='+JSON.stringify(L,null,2)+';root.EchoLevels=levels;if(typeof module!=="undefined"&&module.exports)module.exports=levels;})(globalThis);\n');
fs.writeFileSync('tests/fixtures/echo-solutions.json',JSON.stringify(proofs,null,2)+'\n');
if(failed)process.exitCode=1;
