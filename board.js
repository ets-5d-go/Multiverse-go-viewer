// ===============================
// 2D Go Board (Web Version)
// ===============================

// Canvas を取得
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

// AIの強さ（深さ）
let aiDepth = 1;   // 初期値：弱い
let gameMode = "human_vs_ai";  // 初期モード

// 盤サイズ
const SIZE = 9;
const CELL = 40;

// ★ viewer.js の LAYERS を安全に取得
const LAYERS_SAFE = (typeof LAYERS === "number") ? LAYERS : 5;
// ★ LAYERS を再宣言しない（絶対に const LAYERS を書かない）


// 盤データ（LAYERS が初期化された後に作る）
let board = Array.from({ length: LAYERS_SAFE }, () =>
    Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
);
// 現在の手番
let currentColor = "black";


// -------------------------------
// 層選択（スライダー連動）
// -------------------------------

// ★ グローバルに公開する
window.currentLayerIndex = 0;

function currentLayer() {
return window.currentLayerIndex;
}
// ★ viewer.js からも呼べるように公開
window.currentLayer = currentLayer;

// ★ デモ中フラグ（クリック無効化用）
let demoRunning = false;



// -------------------------------
// 盤を描く
// -------------------------------
function drawBoard() {
ctx.clearRect(0, 0, canvas.width, canvas.height);

ctx.strokeStyle = "yellow";
ctx.lineWidth = 1;

for (let i = 0; i < SIZE; i++) {
// 横線
ctx.beginPath();
ctx.moveTo(CELL, CELL + i * CELL);
ctx.lineTo(CELL * SIZE, CELL + i * CELL);
ctx.stroke();

// 縦線
ctx.beginPath();
ctx.moveTo(CELL + i * CELL, CELL);
ctx.lineTo(CELL + i * CELL, CELL * SIZE);
ctx.stroke();
}
}

// -------------------------------
// 石を描く
// -------------------------------
function drawStone(x, y, color) {
ctx.beginPath();
ctx.arc(
CELL + x * CELL,
CELL + y * CELL,
CELL * 0.4,
0,
Math.PI * 2
);
ctx.fillStyle = color === "black" ? "black" : "white";
ctx.strokeStyle = "black";
ctx.lineWidth = 2;
ctx.fill();
ctx.stroke();
}

// -------------------------------
// クリックで石を置く
// -------------------------------
canvas.addEventListener("click", (e) => {
if (demoRunning) return;   // デモ中はクリック無効化

const rect = canvas.getBoundingClientRect();
const scaleX = canvas.width  / rect.width;
const scaleY = canvas.height / rect.height;

const px = (e.clientX - rect.left) * scaleX;
const py = (e.clientY - rect.top)  * scaleY;

const x = Math.round((px - CELL) / CELL);
const y = Math.round((py - CELL) / CELL);
const z = currentLayer();   // 層を取得

if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
if (board[z][y][x] !== null) return;

board[z][y][x] = currentColor;

addStone3D(x, y, currentColor, z);
removeCapturedStones(x, y, z, currentColor);

currentColor = (currentColor === "black") ? "white" : "black";

if (gameMode === "human_vs_ai") {
    // 人間が黒 → 白AIが返す
    if (currentColor === "white") {
        setTimeout(() => aiPlay(), 500);
    }
} else if (gameMode === "ai_vs_ai") {
    // AI同士の対戦
    if (currentColor === "white") {
        setTimeout(() => aiPlay(), 500);
    } else {
        setTimeout(() => aiPlayBlack(), 500);
    }
}



drawBoard();
drawAllStones();
});

// -------------------------------
// 全石を描画（選択中の層だけ）
// -------------------------------
function drawAllStones() {
const z = currentLayer();

for (let y = 0; y < SIZE; y++) {
for (let x = 0; x < SIZE; x++) {
    if (board[z][y][x] !== null) {
        drawStone(x, y, board[z][y][x]);
    }
}
}
}

// 初期描画
drawBoard();

// -------------------------------
// グループ（連結石）を集める（五次元 DFS）
// -------------------------------
function getGroup(x, y, z, color) {
let visited = new Set();
let group = [];
let stack = [[x, y, z]];

while (stack.length > 0) {
let [cx, cy, cz] = stack.pop();
let key = `${cx},${cy},${cz}`;
if (visited.has(key)) continue;
visited.add(key);

if (cz < 0 || cz >= LAYERS) continue;
if (cy < 0 || cy >= SIZE)   continue;
if (cx < 0 || cx >= SIZE)   continue;

if (board[cz][cy][cx] === color) {
    group.push([cx, cy, cz]);

    let dirs = [
        [ 1,  0,  0], [-1,  0,  0],
        [ 0,  1,  0], [ 0, -1,  0],
        [ 0,  0,  1], [ 0,  0, -1]
    ];

    for (let [dx, dy, dz] of dirs) {
        let nx = cx + dx;
        let ny = cy + dy;
        let nz = cz + dz;

        if (nx >= 0 && nx < SIZE &&
            ny >= 0 && ny < SIZE &&
            nz >= 0 && nz < LAYERS) {
            stack.push([nx, ny, nz]);
        }
    }
}
}

return group;
}

// -------------------------------
// 呼吸点チェック
// -------------------------------
function hasLiberty(group) {
for (let [x, y, z] of group) {
let dirs = [
    [ 1,  0,  0], [-1,  0,  0],
    [ 0,  1,  0], [ 0, -1,  0],
    [ 0,  0,  1], [ 0,  0, -1]
];

for (let [dx, dy, dz] of dirs) {
    let nx = x + dx;
    let ny = y + dy;
    let nz = z + dz;

    if (nx >= 0 && nx < SIZE &&
        ny >= 0 && ny < SIZE &&
        nz >= 0 && nz < LAYERS_SAFE) {

        if (board[nz][ny][nx] === null) {
            return true;
        }
    }
}
}
return false;
}

// -------------------------------
// 取り石処理
// -------------------------------
function removeCapturedStones(x, y, z, color) {
let enemy = (color === "black") ? "white" : "black";

let dirs = [
[ 1, 0, 0], [-1, 0, 0],
[ 0, 1, 0], [ 0, -1, 0],
[ 0, 0, 1], [ 0, 0, -1]
];

for (let [dx, dy, dz] of dirs) {
let nx = x + dx;
let ny = y + dy;
let nz = z + dz;

if (nx >= 0 && nx < SIZE &&
    ny >= 0 && ny < SIZE &&
    nz >= 0 && nz < LAYERS_SAFE) {

    if (board[nz][ny][nx] === enemy) {
        let group = getGroup(nx, ny, nz, enemy);
        if (!hasLiberty(group)) {
            for (let [gx, gy, gz] of group) {
                board[gz][gy][gx] = null;
                removeStone3D(gx, gy, gz);
            }
        }
    }
}
}
}
// -------------------------------
// 合法手判定（三次元対応）
// -------------------------------
function isLegalMove(x, y, z, color) {
// 盤外 or 既に石があるなら即座に不合法
if (x < 0 || x >= SIZE || y < 0 || y >= SIZE || z < 0 || z >= LAYERS) {
return false;
}
if (board[z][y][x] !== null) {
return false;
}

// 一時的に石を置く
board[z][y][x] = color;

let enemy = (color === "black") ? "white" : "black";
let dirs = [
[ 1, 0, 0], [-1, 0, 0],
[ 0, 1, 0], [ 0,-1, 0],
[ 0, 0, 1], [ 0, 0,-1]
];

let captured = false;

// 隣接する敵石グループを調べて、呼吸点がなければ「取り」とみなす
for (let [dx, dy, dz] of dirs) {
let nx = x + dx;
let ny = y + dy;
let nz = z + dz;

if (nx >= 0 && nx < SIZE &&
    ny >= 0 && ny < SIZE &&
    nz >= 0 && nz < LAYERS_SAFE) {

    if (board[nz][ny][nx] === enemy) {
        let g = getGroup(nx, ny, nz, enemy);
        if (!hasLiberty(g)) {
            captured = true;
            // 実際の removeCapturedStones は呼ばず、
            // ここでは「取れるかどうか」だけを見る
        }
    }
}
}

// 自分のグループを取得して呼吸点があるか確認
let myGroup = getGroup(x, y, z, color);
let myHasLiberty = hasLiberty(myGroup);

// 石を元に戻す（盤面を汚さない）
board[z][y][x] = null;

// 取りが発生するなら、自殺でも合法とする
if (captured) {
return true;
}

// 取りがなく、自分のグループに呼吸点がないなら自殺手 → 不合法
if (!myHasLiberty) {
return false;
}

// それ以外は合法
return true;
}
// -------------------------------
// 全合法手生成（三次元対応）
// -------------------------------
function getLegalMoves(color) {
let moves = [];

for (let z = 0; z < LAYERS_SAFE; z++) {
for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
        if (isLegalMove(x, y, z, color)) {
            moves.push({ x, y, z, color });
        }
    }
}
}

return moves;
}
// -------------------------------
// 評価関数（軽量版）
// -------------------------------
function evaluateMove(x, y, z, color) {

let score = 0;

// ① 中央に近いほど高評価（位置の価値）
const center = (SIZE - 1) / 2;
let dist2D = Math.abs(x - center) + Math.abs(y - center);
score += (10 - dist2D);  // 中央ほど高い

// ② 層の中央に近いほど高評価
const layerCenter = (LAYERS_SAFE - 1) / 2;
let distZ = Math.abs(z - layerCenter);
score += (5 - distZ);

// ③ 呼吸点の多さ（安全性）
board[z][y][x] = color;  // 仮置き
let myGroup = getGroup(x, y, z, color);
let myLibertyCount = 0;

let dirs = [
[ 1, 0, 0], [-1, 0, 0],
[ 0, 1, 0], [ 0,-1, 0],
[ 0, 0, 1], [ 0, 0,-1]
];

for (let [cx, cy, cz] of myGroup) {
for (let [dx, dy, dz] of dirs) {
let nx = cx + dx;
let ny = cy + dy;
let nz = cz + dz;

if (nx >= 0 && nx < SIZE &&
    ny >= 0 && ny < SIZE &&
    nz >= 0 && nz < LAYERS_SAFE) {

    if (board[nz][ny][nx] === null) {
        myLibertyCount++;
    }
}
}
}

score += myLibertyCount * 2;  // 呼吸点は重要

// ④ 取りが発生するなら超高評価
let enemy = (color === "black") ? "white" : "black";
let captureBonus = 0;

for (let [dx, dy, dz] of dirs) {
let nx = x + dx;
let ny = y + dy;
let nz = z + dz;

if (nx >= 0 && nx < SIZE &&
ny >= 0 && ny < SIZE &&
nz >= 0 && nz < LAYERS_SAFE) {

if (board[nz][ny][nx] === enemy) {
    let g = getGroup(nx, ny, nz, enemy);
    if (!hasLiberty(g)) {
        captureBonus += g.length * 20;  // 取る石の数 × 20点
    }
}
}
}

score += captureBonus;

// 仮置きを戻す
board[z][y][x] = null;

return score;
}
// -------------------------------
// 盤面コピー（ミニマックス用）
// -------------------------------
function cloneBoard(board) {
return board.map(layer =>
layer.map(row => [...row])
);
}
// -------------------------------
// グループ（連結石）を集める（シミュレーション用）
// -------------------------------
function getGroupSim(boardSim, x, y, z, color) {
let visited = new Set();
let group = [];
let stack = [[x, y, z]];

while (stack.length > 0) {
let [cx, cy, cz] = stack.pop();
let key = `${cx},${cy},${cz}`;
if (visited.has(key)) continue;
visited.add(key);

if (cz < 0 || cz >= LAYERS_SAFE) continue;
if (cy < 0 || cy >= SIZE)   continue;
if (cx < 0 || cx >= SIZE)   continue;

if (boardSim[cz][cy][cx] === color) {
group.push([cx, cy, cz]);

let dirs = [
    [ 1,  0,  0], [-1,  0,  0],
    [ 0,  1,  0], [ 0, -1,  0],
    [ 0,  0,  1], [ 0,  0, -1]
];

for (let [dx, dy, dz] of dirs) {
    let nx = cx + dx;
    let ny = cy + dy;
    let nz = cz + dz;

    if (nx >= 0 && nx < SIZE &&
        ny >= 0 && ny < SIZE &&
        nz >= 0 && nz < LAYERS_SAFE) {
        stack.push([nx, ny, nz]);
    }
}
}
}

return group;
}
// -------------------------------
// 呼吸点チェック（シミュレーション用）
// -------------------------------
function hasLibertySim(boardSim, group) {
let dirs = [
[ 1,  0,  0], [-1,  0,  0],
[ 0,  1,  0], [ 0, -1,  0],
[ 0,  0,  1], [ 0,  0, -1]
];

for (let [x, y, z] of group) {
for (let [dx, dy, dz] of dirs) {
let nx = x + dx;
let ny = y + dy;
let nz = z + dz;

if (nx >= 0 && nx < SIZE &&
    ny >= 0 && ny < SIZE &&
    nz >= 0 && nz < LAYERS_SAFE) {

    if (boardSim[nz][ny][nx] === null) {
        return true;   // 呼吸点あり
    }
}
}
}

return false;  // 呼吸点なし
}
// -------------------------------
// 合法手生成（シミュレーション用）
// -------------------------------
function getLegalMovesSim(boardSim, color) {
let moves = [];

for (let z = 0; z < LAYERS_SAFE; z++) {
for (let y = 0; y < SIZE; y++) {
for (let x = 0; x < SIZE; x++) {

    if (isLegalMoveSim(boardSim, x, y, z, color)) {
        moves.push({ x, y, z, color });
    }

}
}
}

return moves;
}
// -------------------------------
// 合法手判定（シミュレーション用）
// -------------------------------
function isLegalMoveSim(boardSim, x, y, z, color) {

// 盤外 or 既に石があるなら不合法
if (x < 0 || x >= SIZE || y < 0 || y >= SIZE || z < 0 || z >= LAYERS) {
return false;
}
if (boardSim[z][y][x] !== null) {
return false;
}

// 仮置き
boardSim[z][y][x] = color;

let enemy = (color === "black") ? "white" : "black";
let dirs = [
[ 1, 0, 0], [-1, 0, 0],
[ 0, 1, 0], [ 0,-1, 0],
[ 0, 0, 1], [ 0, 0,-1]
];

let captured = false;

// 隣接する敵石グループを調べる
for (let [dx, dy, dz] of dirs) {
let nx = x + dx;
let ny = y + dy;
let nz = z + dz;

if (nx >= 0 && nx < SIZE &&
ny >= 0 && ny < SIZE &&
nz >= 0 && nz < LAYERS_SAFE) {

if (boardSim[nz][ny][nx] === enemy) {
    let g = getGroupSim(boardSim, nx, ny, nz, enemy);
    if (!hasLibertySim(boardSim, g)) {
        captured = true;
    }
}
}
}

// 自分のグループの呼吸点チェック
let myGroup = getGroupSim(boardSim, x, y, z, color);
let myHasLiberty = hasLibertySim(boardSim, myGroup);

// 仮置きを戻す
boardSim[z][y][x] = null;

// 取りが発生するなら合法（自殺手でもOK）
if (captured) {
return true;
}

// 呼吸点がないなら自殺手 → 不合法
if (!myHasLiberty) {
return false;
}

return true;
}
// -------------------------------
// シミュレーションで手を打つ（ミニマックス用）
// -------------------------------
function simulateMove(boardSim, x, y, z, color) {
boardSim[z][y][x] = color;

let enemy = (color === "black") ? "white" : "black";
let dirs = [
[ 1, 0, 0], [-1, 0, 0],
[ 0, 1, 0], [ 0,-1, 0],
[ 0, 0, 1], [ 0, 0,-1]
];

for (let [dx, dy, dz] of dirs) {
let nx = x + dx;
let ny = y + dy;
let nz = z + dz;

if (nx >= 0 && nx < SIZE &&
ny >= 0 && ny < SIZE &&
nz >= 0 && nz < LAYERS_SAFE) {

if (boardSim[nz][ny][nx] === enemy) {
    let g = getGroupSim(boardSim, nx, ny, nz, enemy);
    if (!hasLibertySim(boardSim, g)) {
        for (let [gx, gy, gz] of g) {
            boardSim[gz][gy][gx] = null;
        }
    }
}
}
}
}
// -------------------------------
// 盤面評価（ミニマックス用・軽量版）
// -------------------------------
function evaluateBoard(boardState) {

let score = 0;

const center = (SIZE - 1) / 2;
const layerCenter = (LAYERS_SAFE - 1) / 2;

for (let z = 0; z < LAYERS_SAFE; z++) {
for (let y = 0; y < SIZE; y++) {
for (let x = 0; x < SIZE; x++) {

    let stone = boardState[z][y][x];
    if (stone === null) continue;

    // 白はプラス、黒はマイナス
    let sign = (stone === "white") ? 1 : -1;

    // ① 中央に近いほど高評価
    let dist2D = Math.abs(x - center) + Math.abs(y - center);
    score += sign * (10 - dist2D);

    // ② 層の中央に近いほど高評価
    let distZ = Math.abs(z - layerCenter);
    score += sign * (5 - distZ);

    // ③ 呼吸点の多さ（安全性）
    let group = getGroupSim(boardState, x, y, z, stone);
    let libertyCount = 0;

    let dirs = [
        [ 1, 0, 0], [-1, 0, 0],
        [ 0, 1, 0], [ 0,-1, 0],
        [ 0, 0, 1], [ 0, 0,-1]
    ];

    for (let [cx, cy, cz] of group) {
        for (let [dx, dy, dz] of dirs) {
            let nx = cx + dx;
            let ny = cy + dy;
            let nz = cz + dz;

            if (nx >= 0 && nx < SIZE &&
                ny >= 0 && ny < SIZE &&
                nz >= 0 && nz < LAYERS_SAFE) {

                if (boardState[nz][ny][nx] === null) {
                    libertyCount++;
                }
            }
        }
    }

    score += sign * libertyCount * 2;
}
}
}

return score;
}
// -------------------------------
// ミニマックス本体（深さ2）
// -------------------------------
function minimax(boardState, depth, maximizingPlayer) {

// 深さ0 → 評価関数で盤面を評価
if (depth === 0) {
return evaluateBoard(boardState);
}

if (maximizingPlayer) {
// 白AIの番（最大化）
let moves = getLegalMovesSim(boardState, "white");
let bestScore = -Infinity;

for (let mv of moves) {
let sim = cloneBoard(boardState);
simulateMove(sim, mv.x, mv.y, mv.z, "white");

let score = minimax(sim, depth - 1, false);
bestScore = Math.max(bestScore, score);
}

return bestScore;

} else {
// 黒（人間）の番（最小化）
let moves = getLegalMovesSim(boardState, "black");
let bestScore = Infinity;

for (let mv of moves) {
let sim = cloneBoard(boardState);
simulateMove(sim, mv.x, mv.y, mv.z, "black");

let score = minimax(sim, depth - 1, true);
bestScore = Math.min(bestScore, score);
}

return bestScore;
}
}
// -------------------------------
// 五次元取りデモ
// -------------------------------
const demoMoves = [
{color: "black", x: 4, y: 4, z: 0},
{color: "white", x: 3, y: 4, z: 0},
{color: "white", x: 5, y: 4, z: 0},
{color: "white", x: 4, y: 3, z: 0},
{color: "white", x: 4, y: 5, z: 0},

{color: "black", x: 0, y: 0, z: 0},

{color: "white", x: 4, y: 4, z: 1},
{color: "white", x: 3, y: 4, z: 1},
{color: "white", x: 5, y: 4, z: 1},
{color: "white", x: 4, y: 3, z: 1},
{color: "white", x: 4, y: 5, z: 1},

{color: "black", x: 8, y: 8, z: 0},

{color: "white", x: 4, y: 4, z: 2},
{color: "white", x: 3, y: 4, z: 2},
{color: "white", x: 5, y: 4, z: 2},
{color: "white", x: 4, y: 3, z: 2},
{color: "white", x: 4, y: 5, z: 2},

{color: "white", x: 4, y: 4, z: 3}
];


function runDemo() {
demoRunning = true;
let i = 0;

function playNext() {
if (i >= demoMoves.length) {
    demoRunning = false;
    return;
}

const mv = demoMoves[i];            
window.currentLayerIndex = mv.z;

board[mv.z][mv.y][mv.x] = mv.color;
addStone3D(mv.x, mv.y, mv.color, mv.z);
removeCapturedStones(mv.x, mv.y, mv.z, mv.color);

drawBoard();
drawAllStones();

i++;
setTimeout(playNext, 600);
}

playNext();
}
// -------------------------------
// 合法手（現在の層だけ）
// -------------------------------
function getLegalMovesOnCurrentLayer(color) {
    let moves = [];
    const z = currentLayer();  // 今の層だけ

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (isLegalMove(x, y, z, color)) {
                moves.push({ x, y, z, color });
            }
        }
    }
    return moves;
}
// -------------------------------
// 黒白AIの着手（ミニマックス版）
// -------------------------------
function aiPlay() {

    // 1. 白AIの合法手を全部取得
    let moves = getLegalMoves("white");
    if (moves.length === 0) {
        console.log("白AIは打てる手がありません（パス）");
        currentColor = "black";
        return;
    }

    // 2. ミニマックスで最善手を探す
    let bestMove = null;
    let bestScore = -Infinity;

    for (let mv of moves) {
        let sim = cloneBoard(board);
        simulateMove(sim, mv.x, mv.y, mv.z, "white");
        let score = minimax(sim, aiDepth, false);
        if (score > bestScore) {
            bestScore = score;
            bestMove = mv;
        }
    }

    // 3. 最善手を実際に打つ
    let {x, y, z} = bestMove;

    board[z][y][x] = "white";
    addStone3D(x, y, "white", z);
    removeCapturedStones(x, y, z, "white");

    // 4. 2D盤を更新
    drawBoard();
    drawAllStones();

    // 手番を黒に戻す
    currentColor = "black";

    // ★ AI vs AI の場合は黒AIを続けて呼ぶ
    if (gameMode === "ai_vs_ai") {
        setTimeout(() => aiPlayBlack(), 500);
    }
}
function aiPlayBlack() {

    // 黒AIの合法手を全部取得
    let moves = getLegalMoves("black");
    if (moves.length === 0) {
        console.log("黒AIは打てる手がありません（パス）");
        currentColor = "white";
        return;
    }

    let bestMove = null;
    let bestScore = Infinity;  // 黒は最小化

    for (let mv of moves) {
        let sim = cloneBoard(board);
        simulateMove(sim, mv.x, mv.y, mv.z, "black");
        let score = minimax(sim, aiDepth, true);  // 白が最大化
        if (score < bestScore) {
            bestScore = score;
            bestMove = mv;
        }
    }

    let {x, y, z} = bestMove;

    board[z][y][x] = "black";
    addStone3D(x, y, "black", z);
    removeCapturedStones(x, y, z, "black");

    drawBoard();
    drawAllStones();

    currentColor = "white";

    // ★ AI vs AI の場合は白AIを続けて呼ぶ
    if (gameMode === "ai_vs_ai") {
        setTimeout(() => aiPlay(), 500);
    }
}

// ★ デモボタン
document.getElementById("demoButton").addEventListener("click", runDemo);

// ★ モード切り替えボタン（人間 vs AI）
document.getElementById("modeHumanVsAI").addEventListener("click", () => {
    gameMode = "human_vs_ai";
    console.log("モード：人間 vs AI");
});

// ★ モード切り替えボタン（AI vs AI）
document.getElementById("modeAIVsAI").addEventListener("click", () => {
    gameMode = "ai_vs_ai";
    console.log("モード：AI vs AI");

    // ★ 層を必ず 0 に戻す
    window.currentLayerIndex = 0;
    drawBoard();
    drawAllStones();

    // ★ 黒AIから開始（ここが重要）
    aiPlayBlack();    // ★ 白AIから開始

});

// ★ AI強さボタン
document.getElementById("aiWeak").addEventListener("click", () => {
    aiDepth = 1;
    console.log("AI強さ：弱い（深さ1）");
});

document.getElementById("aiNormal").addEventListener("click", () => {
    aiDepth = 2;
    console.log("AI強さ：普通（深さ2）");
});

document.getElementById("aiStrong").addEventListener("click", () => {
    aiDepth = 3;
    console.log("AI強さ：強い（深さ3）");
});

