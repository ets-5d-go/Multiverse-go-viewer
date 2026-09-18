// ===============================
// 五次元ビューア設定（第6章）
// ===============================
const LAYERS = 5;        // 盤の層数
const LAYER_HEIGHT = 12; // 層の高さ間隔

// ★ 盤設定（グローバルに出す）
const BOARD_SIZE   = 5;
const BOARD_SPACING = 5;
const BOARD_Y      = 2;

// ★ 3D 石オブジェクト管理辞書
window.stoneObjects = {};

// ★ Three.js のシーンを先に作って公開する（ここが重要）
window.scene = new THREE.Scene();
window.scene.background = null;   // ★ 背景を透明にする

// ★ 層ボタンで層を変更する（グローバル）


function setLayer(z) {
    window.currentLayerIndex = z;

    // ★ 2D 盤を更新
    if (typeof drawBoard === "function") {
        drawBoard();
    }
    if (typeof drawAllStones === "function") {
        drawAllStones();
    
    }
    // ★ 3D グリッドを再生成（色を更新するため）
    if (typeof window.rebuildGrid === "function") {
        window.rebuildGrid();
    }
}
window.setLayer = setLayer;
// ★ 3D 石を置く（グローバル）
function addStone3D(x, y, color, layer) {
    const radius = 2;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: (color === "black") ? 0x000000 : 0xffffff
    });

    const stone = new THREE.Mesh(geometry, material);


    const half = (BOARD_SIZE - 1) * BOARD_SPACING / 2;
    const posX = -half + x * BOARD_SPACING;
    const posZ = -half + y * BOARD_SPACING;

    const posY = BOARD_Y + layer * LAYER_HEIGHT;

    stone.position.set(posX, posY, posZ);

    window.scene.add(stone);   // ★ scene をグローバルに公開する必要あり

    const key = `${x},${y},${layer}`;
    window.stoneObjects[key] = stone;
}
window.addStone3D = addStone3D;

// ★ 3D 石を消す（グローバル）
function removeStone3D(x, y, layer) {
    const key = `${x},${y},${layer}`;
    const obj = window.stoneObjects[key];
    if (obj) {
        window.scene.remove(obj);
        delete window.stoneObjects[key];
    }
}
window.removeStone3D = removeStone3D;
// 3D Viewer (Three.js)
// ===============================
function initViewer() {

    // 3D キャンバス
    const viewer = document.getElementById("viewer");

    // レンダラー
const renderer = new THREE.WebGLRenderer({
    canvas: viewer,
    antialias: true,
    alpha: true   // ★ 透明背景を許可
});

    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);



   
      // ★ board.js がまだ読み込まれていない場合の保険
    function currentLayerSafe() {
        if (typeof window.currentLayer === "function") {
            return window.currentLayer();
        }
        return 0; // とりあえず 0 層
    }  


    // カメラ
    const camera = new THREE.PerspectiveCamera(
        45,
        viewer.clientWidth / viewer.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 60, 140);
    camera.lookAt(0, BOARD_Y, 0);


 // ===============================
// 3D 囲碁盤グリッド（層対応版）
// ===============================
function createBoardGrid(layer) {

    // ★ 入力中の層だけ黄色、それ以外は黒
    const color = (layer === window.currentLayerIndex) ? 0xffff00 : 0x000000;
    // ★ 入力中の層は濃く、他の層は薄く
    const opacity = (layer === window.currentLayerIndex) ? 1.0 : 0.25;
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity
    });
    const half = (BOARD_SIZE - 1) * BOARD_SPACING / 2;

    // ★ 層ごとに高さを変える
    const y = BOARD_Y + layer * LAYER_HEIGHT;

    // -------------------------------
    // 横線（X方向に伸びる線）
    // -------------------------------
    for (let i = 0; i < BOARD_SIZE; i++) {

        const z = -half + i * BOARD_SPACING;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(
                new Float32Array([
                    -half, y, z,
                     half, y, z
                     
                ]),
                3
            )
        );

        const line = new THREE.Line(geometry, material);
          
        window.scene.add(line);
    }

    // -------------------------------
    // 縦線（Z方向に伸びる線）
    // -------------------------------
    for (let i = 0; i < BOARD_SIZE; i++) {

        const x = -half + i * BOARD_SPACING;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(
                new Float32Array([
                    x, y, -half,
                    x, y,  half
                ]),
                3
            )
        );

        const line = new THREE.Line(geometry, material);
     
        window.scene.add(line);
    }
}   
for (let layer = 0; layer < LAYERS; layer++) {
    createBoardGrid(layer);
}

// ライト
    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(50, 80, 120);
    window.scene.add(light);

    // カメラ操作
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // アニメーション
    function animate() {
        controls.update();
        renderer.render(window.scene, camera);
        requestAnimationFrame(animate);
    }



// ★ これを必ず追加
window.addStone3D = addStone3D;

    // ★ 3D グリッドを再生成（層色の更新用）
    function rebuildGrid() {

        // ★ 既存のグリッド線(Line)を全部削除
        for (let i = window.scene.children.length - 1; i >= 0; i--) {
            const obj = window.scene.children[i];
            if (obj.type === "Line") {
                window.scene.remove(obj);
            }
        }

        // ★ 新しいグリッドを層ごとに生成
        for (let layer = 0; layer < LAYERS; layer++) {
            createBoardGrid(layer);
        }
    }
    // ★ rebuildGrid をグローバル公開
    window.rebuildGrid = rebuildGrid;
    // ★ これが絶対に必要
    animate();
}   