// ===============================
// 五次元ビューア設定（第6章）
// ===============================
const LAYERS = 5;        // 盤の層数
const LAYER_HEIGHT = 12; // 層の高さ間隔
// ★ 3D 石オブジェクト管理辞書（ここに置く！）
window.stoneObjects = {};
// 3D Viewer (Three.js)
// ===============================
function initViewer() {

    // 3D キャンバス
    const viewer = document.getElementById("viewer");

    // レンダラー
    const renderer = new THREE.WebGLRenderer({
        canvas: viewer,
        antialias: true
    });
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // 盤設定
    const BOARD_SIZE = 9;
    const BOARD_SPACING = 5;
    const BOARD_Y = 2;

    // シーン
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

      // ★ board.js がまだ読み込まれていない場合の保険
    function currentLayerSafe() {
        if (typeof window.currentLayer === "function") {
            return window.currentLayer();
        }
        return 0; // とりあえず 0 層
    }  
    // ★ ここに removeStone3D を入れる！
    function removeStone3D(x, y, layer) {
        const key = `${x},${y},${layer}`;
        const obj = window.stoneObjects[key];
        if (obj) {
            scene.remove(obj);
            delete window.stoneObjects[key];
        }
    }

    // 公開（board.js から呼べるように）
    window.removeStone3D = removeStone3D;

    // カメラ
    const camera = new THREE.PerspectiveCamera(
        45,
        viewer.clientWidth / viewer.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 50, 120);
    camera.lookAt(0, BOARD_Y, 0);


 // ===============================
// 3D 囲碁盤グリッド（層対応版）
// ===============================
function createBoardGrid(layer) {
    const opacity = (layer === currentLayerSafe()) ? 1.0 : 0.25;
    const material = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
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
        scene.add(line);
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
        scene.add(line);
    }
}   
for (let layer = 0; layer < LAYERS; layer++) {
    createBoardGrid(layer);
}
// ライト
    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(50, 80, 120);
    scene.add(light);

    // カメラ操作
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // アニメーション
    function animate() {
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }


// 石を置く（層対応版）
function addStone3D(x, y, color, layer ) {
    const radius = 5;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: (color === "black") ? 0x000000 : 0xffffff
    });

    const stone = new THREE.Mesh(geometry, material);

    const half = (BOARD_SIZE - 1) * BOARD_SPACING / 2;
    const posX = -half + x * BOARD_SPACING;
    const posZ = -half + y * BOARD_SPACING;
    const posY = radius + layer * LAYER_HEIGHT;

    stone.position.set(posX, posY, posZ);
    scene.add(stone);

    // ★ 石を記録（キーは x,y,z）
    const key = `${x},${y},${layer}`;
    window.stoneObjects[key] = stone;
}
// ★ これを必ず追加
window.addStone3D = addStone3D;
    // ★ これが絶対に必要
    animate();
}   // ★ initViewer の閉じ