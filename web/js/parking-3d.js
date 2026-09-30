/**
 * Smart Parking System — 3D Digital Twin Sa Bàn Bãi Đỗ Xe Thông Minh (Phiên bản Mở Rộng & Đẳng Cấp)
 * - Chiều dài mở rộng 44m (Tỉ lệ chuẩn sang trọng, thông thoáng)
 * - Tích hợp đầy đủ điểm nhấn thông minh:
 *   + Bảng điện tử VMS LED thông minh tại cổng báo số chỗ trống realtime
 *   + Trạm sạc xe điện nhanh (EV Fast Charger) công nghệ cao
 *   + 2 Cột đèn LED chiếu sáng thông minh (Smart Streetlights) với quầng sáng ấm áp
 *   + Gờ giảm tốc 3D (Speed Bumps) màu vàng-đen trước barie
 *   + Vạch đi bộ an toàn (Zebra Crossing) kết nối nhà điều hành
 *   + Bồn cây xanh / Tiểu cảnh đô thị (Modern Planters & Hedges)
 *   + Nhà điều hành OLED 3D, RFID RC522, Cần Barie Servo tự động, Cột Camera ANPR
 *   + Mô hình xe ô tô 3D chân thực kèm biển số nổi phản quang
 */

(function () {
  'use strict';

  const Parking3D = {
    isInitialized: false,
    container: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    clock: null,

    // Quản lý các đối tượng 3D
    slotsGroup: {},       // A01 -> A06
    carsGroup: {},        // A01 -> A06
    indicatorsGroup: {},  // Đèn LED cảm biến A01 -> A06
    barrierArmIn: null,   // Cần barie vào
    barrierArmOut: null,  // Cần barie ra
    barrierInAngle: 0,    // Góc mục tiêu (radians)
    barrierOutAngle: 0,
    oledCanvas: null,
    oledTexture: null,
    oledMesh: null,
    vmsCanvas: null,      // Bảng LED điện tử lớn ngoài cổng
    vmsTexture: null,
    vmsMesh: null,
    streetLights: [],

    // Cấu hình
    currentView: '3d',
    autoRotate: false,
    raycaster: null,
    mouse: null,
    hoveredSlot: null,
    slotsData: [],

    /**
     * Khởi tạo sa bàn 3D trong container
     */
    init(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      if (typeof THREE === 'undefined') {
        setTimeout(() => this.init(containerId), 200);
        return;
      }

      this.container.innerHTML = '';
      this.clock = new THREE.Clock();
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();

      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 480;

      // 1. Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x111827); // Dark navy slate sang trọng
      this.scene.fog = new THREE.FogExp2(0x111827, 0.012);

      // 2. Camera: Góc nhìn bao quát toàn bộ chiều dài sa bàn
      this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
      this.camera.position.set(26, 30, 32);

      // 3. Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      this.container.appendChild(this.renderer.domElement);

      // 4. Controls
      if (typeof THREE.OrbitControls !== 'undefined') {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.12;
        this.controls.minDistance = 15;
        this.controls.maxDistance = 85;
        this.controls.target.set(0, 0, 1.5);
      }

      // 5. Ánh sáng
      this.setupLights();

      // 6. Xây dựng Sa bàn (Chiều dài mở rộng 44m, vỉa hè, tường viền, vạch kẻ đường)
      this.buildEnvironment();

      // 7. Tạo 6 ô đỗ xe A01 - A06 (Bố trí khoảng cách thông thoáng)
      this.buildParkingSlots();

      // 8. Nhà điều hành trung tâm + Màn hình OLED + RFID
      this.buildControlBooth();

      // 9. Cổng Barie tự động IN / OUT
      this.buildBarriers();

      // 10. Trụ Camera giám sát ANPR
      this.buildCameras();

      // 11. Các điểm nhấn thông minh (Bảng LED VMS, Trạm sạc EV, Cột đèn LED, Gờ giảm tốc, Bồn cây)
      this.buildSmartFeatures();

      // 12. Sự kiện tương tác chuột & Resize
      this.setupEvents();

      // 13. Vòng lặp render animation
      this.isInitialized = true;
      this.animate();

      // Đồng bộ dữ liệu sẵn có
      if (this.slotsData && this.slotsData.length) {
        this.updateSlots(this.slotsData);
      }
    },

    /**
     * Hệ thống ánh sáng thực tế & Đèn chiếu sáng thông minh
     */
    setupLights() {
      // Ánh sáng môi trường
      const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.65);
      this.scene.add(ambientLight);

      // Ánh sáng mặt trời chiếu nghiêng tạo bóng đổ mềm
      const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
      sunLight.position.set(28, 42, 26);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 110;
      sunLight.shadow.camera.left = -26;
      sunLight.shadow.camera.right = 26;
      sunLight.shadow.camera.top = 28;
      sunLight.shadow.camera.bottom = -28;
      sunLight.shadow.bias = -0.0004;
      this.scene.add(sunLight);

      // Ánh sáng phản chiếu mềm
      const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1f2937, 0.45);
      this.scene.add(hemiLight);
    },

    /**
     * Xây dựng mặt bằng sa bàn mở rộng chiều dài (34m x 44m)
     */
    buildEnvironment() {
      const rootGroup = new THREE.Group();

      // 1. Đế sa bàn chính (Màu trắng formex cao cấp có viền nổi)
      const baseGeo = new THREE.BoxGeometry(34, 1.4, 44);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.3 });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = -0.7;
      baseMesh.receiveShadow = true;
      rootGroup.add(baseMesh);

      // 2. Viền tường bảo vệ xung quanh (Tương ứng vách xốp trắng trong ảnh)
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.25 });

      // Tường sau
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(34, 2.4, 0.8), wallMat);
      backWall.position.set(0, 0.9, -21.6);
      backWall.castShadow = true;
      backWall.receiveShadow = true;
      rootGroup.add(backWall);

      // Tường trái
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 44), wallMat);
      leftWall.position.set(-16.6, 0.9, 0);
      leftWall.castShadow = true;
      leftWall.receiveShadow = true;
      rootGroup.add(leftWall);

      // Tường phải (Khoảng hở cổng thông thoáng)
      const rightWall1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 18), wallMat);
      rightWall1.position.set(16.6, 0.9, -12.5);
      rightWall1.castShadow = true;
      rightWall1.receiveShadow = true;
      rootGroup.add(rightWall1);

      const rightWall2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 16), wallMat);
      rightWall2.position.set(16.6, 0.9, 13.5);
      rightWall2.castShadow = true;
      rightWall2.receiveShadow = true;
      rootGroup.add(rightWall2);

      // 3. Mặt đường nhựa Asphalt cao cấp (Xám than tương phản cực đẹp)
      const roadGeo = new THREE.PlaneGeometry(32.4, 42.4);
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0x222a38,
        roughness: 0.88,
        metalness: 0.08
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0.01;
      road.receiveShadow = true;
      rootGroup.add(road);

      // 4. Vạch kẻ sơn phân làn đường, tim đường vàng, mũi tên
      this.createRoadMarkings(rootGroup);

      this.scene.add(rootGroup);
    },

    /**
     * Vạch kẻ đường giao thông, tim đường nét đứt, mũi tên và vạch sang đường
     */
    createRoadMarkings(parent) {
      const markings = new THREE.Group();

      // Tim đường nét đứt màu vàng dạ quang trong bãi đỗ
      const dashMat = new THREE.MeshBasicMaterial({ color: 0xFACC15 });
      for (let z = -17; z <= 6; z += 3.4) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 2.0), dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(0, 0.02, z);
        markings.add(dash);
      }

      // Vạch biên giới hạn làn xe màu trắng
      const whiteMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
      const borderLineL = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 30), whiteMat);
      borderLineL.rotation.x = -Math.PI / 2;
      borderLineL.position.set(-4.6, 0.02, -4);
      markings.add(borderLineL);

      const borderLineR = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 30), whiteMat);
      borderLineR.rotation.x = -Math.PI / 2;
      borderLineR.position.set(4.6, 0.02, -4);
      markings.add(borderLineR);

      // Vạch dừng xe (STOP BAR) tại 2 cổng Barie rộng 4.1m
      const stopIn = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.45), whiteMat);
      stopIn.rotation.x = -Math.PI / 2;
      stopIn.position.set(3.35, 0.025, 15.2);
      markings.add(stopIn);

      const stopOut = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.45), whiteMat);
      stopOut.rotation.x = -Math.PI / 2;
      stopOut.position.set(-3.35, 0.025, 12.8);
      markings.add(stopOut);

      // Mũi tên chỉ hướng đi trong bãi đỗ
      const arrowTexture = this.generateArrowTexture();
      const arrowMat = new THREE.MeshBasicMaterial({ map: arrowTexture, transparent: true });

      const arrowPositions = [-12, -4, 3];
      arrowPositions.forEach(zPos => {
        const arrow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.4), arrowMat);
        arrow.rotation.x = -Math.PI / 2;
        arrow.position.set(0, 0.03, zPos);
        markings.add(arrow);
      });

      // Mũi tên Làn Vào (IN) hướng vào trong bãi
      const arrowIn = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), arrowMat);
      arrowIn.rotation.x = -Math.PI / 2;
      arrowIn.position.set(3.35, 0.03, 18.0);
      markings.add(arrowIn);

      // Mũi tên Làn Ra (OUT) hướng ra ngoài cổng
      const arrowOut = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.2), arrowMat);
      arrowOut.rotation.x = -Math.PI / 2;
      arrowOut.rotation.z = Math.PI;
      arrowOut.position.set(-3.35, 0.03, 11.2);
      markings.add(arrowOut);

      // Vạch đi bộ qua đường (Zebra Crossing) kết nối lối đi bộ
      for (let x = -5.0; x <= 5.0; x += 1.0) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2.0), whiteMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x, 0.025, 8.2);
        markings.add(stripe);
      }

      parent.add(markings);
    },

    /**
     * Mũi tên sơn phản quang trên mặt đường
     */
    generateArrowTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(64, 225);
      ctx.lineTo(18, 145);
      ctx.lineTo(46, 145);
      ctx.lineTo(46, 35);
      ctx.lineTo(82, 35);
      ctx.lineTo(82, 145);
      ctx.lineTo(110, 145);
      ctx.closePath();
      ctx.fill();

      return new THREE.CanvasTexture(canvas);
    },

    /**
     * Xây dựng 6 vị trí đỗ xe A01 - A06 (Khoảng cách kéo dài thông thoáng)
     * Bên trái: A01, A02, A03 (z: -12.5, -4.5, 3.5)
     * Bên phải: A04, A05, A06 (z: -12.5, -4.5, 3.5)
     */
    buildParkingSlots() {
      const slotConfigs = [
        // Hàng bên trái
        { code: 'A01', pos: [-10.5, 0.02, -12.5], side: 'left' },
        { code: 'A02', pos: [-10.5, 0.02, -4.5],  side: 'left' },
        { code: 'A03', pos: [-10.5, 0.02, 3.5],   side: 'left' },

        // Hàng bên phải
        { code: 'A04', pos: [10.5, 0.02, -12.5],  side: 'right' },
        { code: 'A05', pos: [10.5, 0.02, -4.5],   side: 'right' },
        { code: 'A06', pos: [10.5, 0.02, 3.5],    side: 'right' },
      ];

      slotConfigs.forEach((cfg) => {
        const slotGroup = new THREE.Group();
        slotGroup.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        slotGroup.userData = { slotCode: cfg.code, isSlot: true };

        // 1. Khung vạch sơn ô đỗ xe với mã số hướng thẳng về phía camera (không bị ngược chữ)
        const bayLineGeo = new THREE.PlaneGeometry(8.6, 5.4);
        const bayTexture = this.generateBayTexture(cfg.code, cfg.side);
        const bayMat = new THREE.MeshBasicMaterial({ map: bayTexture, transparent: true });
        const bayMesh = new THREE.Mesh(bayLineGeo, bayMat);
        bayMesh.rotation.x = -Math.PI / 2;
        slotGroup.add(bayMesh);

        // 2. Chốt chặn bánh xe cao cấp (Wheel Stop Bar) viền vàng đen phản quang
        const stopGeo = new THREE.BoxGeometry(0.38, 0.28, 4.4);
        const stopMat = new THREE.MeshStandardMaterial({ color: 0xFACC15, roughness: 0.35 });
        const stopMesh = new THREE.Mesh(stopGeo, stopMat);
        const stopX = cfg.side === 'left' ? -3.9 : 3.9;
        stopMesh.position.set(stopX, 0.14, 0);
        stopMesh.castShadow = true;
        slotGroup.add(stopMesh);

        // 3. Trụ cảm biến hồng ngoại IR FC-51 gắn đèn LED vòm phát quang
        const irTower = this.buildIRSensorTower(cfg.code);
        const towerX = cfg.side === 'left' ? -4.2 : 4.2;
        irTower.position.set(towerX, 0, 2.3);
        slotGroup.add(irTower);

        // 4. Mô hình Xe 3D ô tô
        const car = this.buildCarModel(cfg.code);
        car.position.set(0, 0, 0);
        car.rotation.y = cfg.side === 'left' ? 0 : Math.PI;
        car.visible = false;
        slotGroup.add(car);
        this.carsGroup[cfg.code] = car;

        this.scene.add(slotGroup);
        this.slotsGroup[cfg.code] = slotGroup;
      });
    },

    /**
     * Tạo texture ô đỗ xe chữ xuôi chiều với góc nhìn người xem
     */
    generateBayTexture(code, side) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Vạch sơn chữ U màu trắng phản quang
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 14;
      ctx.strokeRect(12, 12, 488, 232);

      // Mã ô đỗ: Chữ xuôi chiều dễ đọc từ góc nhìn camera
      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 64px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(code, 256, 128);

      const texture = new THREE.CanvasTexture(canvas);
      // Xoay texture phù hợp cho từng bên để chữ luôn xuôi
      texture.center.set(0.5, 0.5);
      texture.rotation = side === 'left' ? 0 : Math.PI;
      return texture;
    },

    /**
     * Trụ cảm biến hồng ngoại IR gắn đèn LED phát quang
     */
    buildIRSensorTower(code) {
      const group = new THREE.Group();

      // Thân trụ màu trắng xốp formex
      const boxGeo = new THREE.BoxGeometry(0.75, 1.8, 0.75);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.25 });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.y = 0.9;
      box.castShadow = true;
      group.add(box);

      // Mắt cảm biến đen
      const eyeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 16);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0F172A });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.rotation.z = Math.PI / 2;
      eye.position.set(0.38, 1.1, 0);
      group.add(eye);

      // Vòng đèn LED vòm phát quang trên đỉnh
      const ledGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x10B981, // Xanh lá = Trống
        emissive: 0x10B981,
        emissiveIntensity: 1.0,
        roughness: 0.1
      });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.y = 1.9;
      group.add(led);

      const pointLight = new THREE.PointLight(0x10B981, 1.0, 4.5);
      pointLight.position.y = 1.95;
      group.add(pointLight);

      this.indicatorsGroup[code] = { mesh: led, light: pointLight };
      return group;
    },

    /**
     * Mô hình Xe 3D ô tô với biển số xe nổi
     */
    buildCarModel(code) {
      const carGroup = new THREE.Group();
      carGroup.userData = { code, isCar: true };

      const colorPalette = [0x2563EB, 0xDC2626, 0xF8FAFC, 0x334155, 0x0D9488];
      const carColor = colorPalette[parseInt(code.slice(-1), 10) % colorPalette.length];

      const bodyMat = new THREE.MeshStandardMaterial({
        color: carColor,
        roughness: 0.22,
        metalness: 0.7,
        clearcoat: 0.6
      });

      // Thân xe
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.95, 2.45), bodyMat);
      chassis.position.y = 0.72;
      chassis.castShadow = true;
      carGroup.add(chassis);

      // Cabin kính
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.8, 2.1), bodyMat);
      cabin.position.set(-0.35, 1.5, 0);
      cabin.castShadow = true;
      carGroup.add(cabin);

      // Kính đen
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.08, metalness: 0.95 });
      const glassFront = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 1.9), glassMat);
      glassFront.position.set(1.2, 1.5, 0);
      carGroup.add(glassFront);

      // 4 Bánh xe
      const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.32, 18);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.65 });
      const wheelPositions = [
        [1.65, 0.4, 1.25],
        [1.65, 0.4, -1.25],
        [-1.65, 0.4, 1.25],
        [-1.65, 0.4, -1.25]
      ];
      wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(pos[0], pos[1], pos[2]);
        wheel.castShadow = true;
        carGroup.add(wheel);
      });

      // Đèn pha trước
      const headMat = new THREE.MeshBasicMaterial({ color: 0xFEF08A });
      const headL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.45), headMat);
      headL.position.set(2.7, 0.78, 0.8);
      const headR = headL.clone();
      headR.position.set(2.7, 0.78, -0.8);
      carGroup.add(headL);
      carGroup.add(headR);

      // Biển số xe nổi
      const plateMesh = this.createPlateBadge('51A-123.45');
      plateMesh.position.set(0, 2.65, 0);
      plateMesh.name = 'plateBadge';
      carGroup.add(plateMesh);

      return carGroup;
    },

    /**
     * Huy hiệu biển số nổi
     */
    createPlateBadge(plateText) {
      const canvas = document.createElement('canvas');
      canvas.width = 340;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 6;
      this.drawRoundedRect(ctx, 4, 4, 332, 88, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#DA251D';
      ctx.fillRect(18, 20, 36, 24);
      ctx.fillStyle = '#FFEB3B';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', 36, 38);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 36px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(plateText, 185, 48);

      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
      sprite.scale.set(3.4, 0.98, 1);
      return sprite;
    },

    /**
     * Nhà điều hành trung tâm (Booth) có màn hình OLED xanh & RFID RC522
     * Đặt ở Z = 14.0 (Đủ khoảng cách thông thoáng với ô A03/A06)
     */
    /**
     * Nhà điều hành trung tâm (Booth) nguyên bản theo mô hình thực tế BTL
     * Đặt ở Z = 14.0, kích thước cân đối với 2 làn barie rộng 4.0m
     */
    buildControlBooth() {
      const boothGroup = new THREE.Group();
      boothGroup.position.set(0, 0, 14.0);

      // 1. Thân nhà điều hành formex trắng cao cấp
      const booth = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 2.5, 3.0),
        new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.28 })
      );
      booth.position.y = 1.25;
      booth.castShadow = true;
      boothGroup.add(booth);

      // 2. Mái nhà vát cạnh formex trắng
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(2.9, 0.35, 3.3),
        new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.2 })
      );
      roof.position.y = 2.65;
      roof.castShadow = true;
      boothGroup.add(roof);

      // 3. Kính quan sát phía trước (+Z hướng ra cổng)
      const winFront = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 1.0, 0.08),
        new THREE.MeshPhysicalMaterial({
          color: 0x38BDF8,
          transparent: true,
          opacity: 0.65,
          roughness: 0.1,
          transmission: 0.7
        })
      );
      winFront.position.set(0, 1.6, 1.51);
      boothGroup.add(winFront);

      // Kính quan sát phía sau (-Z hướng vào bãi)
      const winBack = winFront.clone();
      winBack.position.set(0, 1.6, -1.51);
      boothGroup.add(winBack);

      // 4. Màn hình OLED xanh dương phát sáng realtime ở mặt trước bốt
      this.oledCanvas = document.createElement('canvas');
      this.oledCanvas.width = 256;
      this.oledCanvas.height = 128;
      this.updateOledScreen(4, 6);

      this.oledTexture = new THREE.CanvasTexture(this.oledCanvas);
      this.oledMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.8),
        new THREE.MeshBasicMaterial({ map: this.oledTexture })
      );
      this.oledMesh.position.set(0, 0.85, 1.52);
      boothGroup.add(this.oledMesh);

      const oledLight = new THREE.PointLight(0x06B6D4, 0.85, 3.5);
      oledLight.position.set(0, 0.85, 1.9);
      boothGroup.add(oledLight);

      // 5. Module RFID RC522 + Thẻ xanh trên nóc (như mô hình thật)
      const rfid = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.12, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x1E3A8A, roughness: 0.4 })
      );
      rfid.position.set(0.5, 2.88, 0.2);
      boothGroup.add(rfid);

      const tag = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16),
        new THREE.MeshStandardMaterial({ color: 0x2563EB, roughness: 0.3 })
      );
      tag.position.set(0.5, 2.96, 0.4);
      boothGroup.add(tag);

      this.scene.add(boothGroup);
    },

    /**
     * Cập nhật màn hình OLED
     */
    updateOledScreen(freeCount, totalCount) {
      if (!this.oledCanvas) return;
      const ctx = this.oledCanvas.getContext('2d');
      ctx.fillStyle = '#050D1A';
      ctx.fillRect(0, 0, 256, 128);

      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 248, 120);

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SMART PARKING', 128, 32);

      ctx.fillStyle = '#22D3EE';
      ctx.font = 'bold 32px "JetBrains Mono", monospace';
      ctx.fillText(`TRỐNG: ${freeCount}/${totalCount}`, 128, 76);

      ctx.fillStyle = '#4ADE80';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText('● SYSTEM READY', 128, 108);

      if (this.oledTexture) this.oledTexture.needsUpdate = true;
      if (this.vmsTexture) this.updateVMSScreen(freeCount, totalCount);
    },

    /**
     * Barie tự động IN / OUT - Cần barie dài chắn trọn vẹn 2 làn đường rộng rãi
     */
    buildBarriers() {
      const barrierMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.25 });
      const accentMat = new THREE.MeshStandardMaterial({ color: 0xF59E0B, roughness: 0.25 });
      const basePlateMat = new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.5 });
      const boomTexture = this.generateBoomTexture();

      // ── 1. BARIE CỔNG VÀO (IN) - Đặt tại lề ngoài bên phải X = +5.4 ──
      const gateInGroup = new THREE.Group();
      gateInGroup.position.set(5.4, 0, 14.0);

      const baseIn = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), basePlateMat);
      baseIn.position.y = 0.04;
      gateInGroup.add(baseIn);

      const postIn = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.45, 0.55), barrierMat);
      postIn.position.y = 0.08 + 0.725;
      postIn.castShadow = true;
      gateInGroup.add(postIn);

      const capIn = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.12, 0.57), accentMat);
      capIn.position.y = 0.08 + 1.45 + 0.06;
      gateInGroup.add(capIn);

      this.barrierArmIn = new THREE.Group();
      this.barrierArmIn.position.set(-0.3, 1.15, 0);

      const hubIn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.14, 16),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
      );
      hubIn.rotation.x = Math.PI / 2;
      this.barrierArmIn.add(hubIn);

      // Cần Barie dài 4.1m chạm sát tường nhà điều hành
      const boomMeshIn = new THREE.Mesh(
        new THREE.BoxGeometry(4.1, 0.14, 0.08),
        new THREE.MeshStandardMaterial({ map: boomTexture })
      );
      boomMeshIn.position.x = -2.05;
      boomMeshIn.castShadow = true;
      this.barrierArmIn.add(boomMeshIn);

      const tipLedIn = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xEF4444 })
      );
      tipLedIn.position.set(-4.1, 0, 0);
      this.barrierArmIn.add(tipLedIn);

      gateInGroup.add(this.barrierArmIn);
      this.scene.add(gateInGroup);

      // ── 2. BARIE CỔNG RA (OUT) - Đặt tại lề ngoài bên trái X = -5.4 ──
      const gateOutGroup = new THREE.Group();
      gateOutGroup.position.set(-5.4, 0, 14.0);

      const baseOut = baseIn.clone();
      gateOutGroup.add(baseOut);

      const postOut = postIn.clone();
      gateOutGroup.add(postOut);

      const capOut = capIn.clone();
      gateOutGroup.add(capOut);

      this.barrierArmOut = new THREE.Group();
      this.barrierArmOut.position.set(0.3, 1.15, 0);

      const hubOut = hubIn.clone();
      this.barrierArmOut.add(hubOut);

      // Cần Barie dài 4.1m chạm sát tường nhà điều hành
      const boomMeshOut = new THREE.Mesh(
        new THREE.BoxGeometry(4.1, 0.14, 0.08),
        new THREE.MeshStandardMaterial({ map: boomTexture })
      );
      boomMeshOut.position.x = 2.05;
      boomMeshOut.castShadow = true;
      this.barrierArmOut.add(boomMeshOut);

      const tipLedOut = tipLedIn.clone();
      tipLedOut.position.set(4.1, 0, 0);
      this.barrierArmOut.add(tipLedOut);

      gateOutGroup.add(this.barrierArmOut);
      this.scene.add(gateOutGroup);
    },

    generateBoomTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 256, 32);

      ctx.fillStyle = '#EF4444';
      for (let x = 0; x < 256; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 16, 0);
        ctx.lineTo(x, 32);
        ctx.lineTo(x - 16, 32);
        ctx.closePath();
        ctx.fill();
      }
      return new THREE.CanvasTexture(canvas);
    },

    /**
     * Trụ Camera ANPR giám sát biển số xe:
     * - Camera Cổng Vào: Hướng VÀO TRONG bãi xe (quét xe đi vào)
     * - Camera Cổng Ra: Hướng RA NGOÀI cổng bãi xe (quét xe đi ra)
     */
    buildCameras() {
      const cameraConfigs = [
        // Camera Cổng Vào (Lane IN X > 0): Đặt ở Z = 16.5, hướng VÀO TRONG bãi xe (về phía -Z)
        { pos: [6.0, 0, 16.5], rotY: -(Math.PI - 0.35) },
        // Camera Cổng Ra (Lane OUT X < 0): Đặt ở Z = 11.5, hướng RA NGOÀI bãi xe (về phía +Z)
        { pos: [-6.0, 0, 11.5], rotY: 0.35 }
      ];

      cameraConfigs.forEach(cfg => {
        const camGroup = new THREE.Group();
        camGroup.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);

        // Cột trụ kim loại
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 3.8, 16),
          new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.8, roughness: 0.3 })
        );
        pole.position.y = 1.9;
        pole.castShadow = true;
        camGroup.add(pole);

        // Khung xoay đầu camera + thấu kính + nón ánh sáng nhận diện
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 3.8, 0);

        // Hộp camera
        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.42, 0.95),
          new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.2 })
        );
        head.castShadow = true;
        headGroup.add(head);

        // Ống kính camera mặt trước (+Z cục bộ)
        const lens = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16),
          new THREE.MeshBasicMaterial({ color: 0x38BDF8 })
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, 0, 0.48);
        headGroup.add(lens);

        // Đèn hồng ngoại phụ trợ
        const irGlow = new THREE.PointLight(0x38BDF8, 0.6, 3);
        irGlow.position.set(0, 0, 0.6);
        headGroup.add(irGlow);

        // Nón ánh sáng quét nhận diện biển số (hướng chếch xuống mặt đường)
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(2.4, 6.2, 16, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0x38BDF8,
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
            depthWrite: false
          })
        );
        cone.position.set(0, -2.1, 3.0);
        cone.rotation.x = -Math.PI / 2.4;
        headGroup.add(cone);

        // Xoay đầu camera cùng nón ánh sáng theo đúng hướng yêu cầu
        headGroup.rotation.y = cfg.rotY;
        camGroup.add(headGroup);

        this.scene.add(camGroup);
      });
    },

    /**
     * CÁC ĐIỂM NHẤN BÃI ĐỖ XE THÔNG MINH (SMART HIGHLIGHTS)
     */
    buildSmartFeatures() {
      const smartGroup = new THREE.Group();

      // ── 1. BẢNG LED ĐIỆN TỬ VMS LỚN TẠI CỔNG VÀO (Smart LED Entrance Display) ──
      const vmsGroup = new THREE.Group();
      vmsGroup.position.set(8.5, 0, 18.5);

      // 2 Cột trụ kim loại
      const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2, 16), postMat);
      p1.position.set(-1.4, 2.1, 0);
      const p2 = p1.clone();
      p2.position.set(1.4, 2.1, 0);
      vmsGroup.add(p1);
      vmsGroup.add(p2);

      // Khung bảng LED
      const vmsBox = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 1.8, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x0F172A, roughness: 0.2 })
      );
      vmsBox.position.y = 4.2;
      vmsBox.castShadow = true;
      vmsGroup.add(vmsBox);

      // Mặt hiển thị ma trận LED
      this.vmsCanvas = document.createElement('canvas');
      this.vmsCanvas.width = 512;
      this.vmsCanvas.height = 256;
      this.updateVMSScreen(4, 6);

      this.vmsTexture = new THREE.CanvasTexture(this.vmsCanvas);
      this.vmsMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.6), new THREE.MeshBasicMaterial({ map: this.vmsTexture }));
      this.vmsMesh.position.set(0, 4.2, -0.16);
      this.vmsMesh.rotation.y = Math.PI;
      vmsGroup.add(this.vmsMesh);

      // Ánh sáng xanh phát quang từ bảng LED
      const vmsGlow = new THREE.PointLight(0x06B6D4, 0.9, 6);
      vmsGlow.position.set(0, 4.2, 0.4);
      vmsGroup.add(vmsGlow);
      smartGroup.add(vmsGroup);

      // ── 2. TRẠM SẠC XE ĐIỆN NHANH (EV FAST CHARGING STATION) ──
      const evGroup = new THREE.Group();
      evGroup.position.set(-14.8, 0, -12.5); // Đặt cạnh ô A01

      // Trụ sạc màu trắng viền xanh neon
      const evPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 2.6, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2 })
      );
      evPillar.position.y = 1.3;
      evPillar.castShadow = true;
      evGroup.add(evPillar);

      // Màn hình trạm sạc EV
      const evScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.7),
        new THREE.MeshBasicMaterial({ color: 0x10B981 }) // Xanh lá sạc
      );
      evScreen.position.set(0.46, 1.6, 0);
      evScreen.rotation.y = Math.PI / 2;
      evGroup.add(evScreen);

      // Vòng LED biểu tượng sạc điện ⚡
      const evLight = new THREE.PointLight(0x10B981, 0.85, 3.5);
      evLight.position.set(0.6, 1.6, 0);
      evGroup.add(evLight);
      smartGroup.add(evGroup);

      // ── 3. 2 CỘT ĐÈN CHIẾU SÁNG THÔNG MINH (SMART STREETLIGHTS) ──
      const lampPositions = [[-15.0, 0, -4.5], [15.0, 0, -4.5]];
      lampPositions.forEach(pos => {
        const lampGroup = new THREE.Group();
        lampGroup.position.set(pos[0], pos[1], pos[2]);

        // Cột đèn uốn cong hiện đại
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.18, 6.2, 16),
          new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.85, roughness: 0.2 })
        );
        pole.position.y = 3.1;
        pole.castShadow = true;
        lampGroup.add(pole);

        // Chóa đèn vươn ra lòng đường
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(pos[0] < 0 ? 1.8 : -1.8, 0.12, 0.35),
          new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.85 })
        );
        arm.position.set(pos[0] < 0 ? 0.9 : -0.9, 6.1, 0);
        lampGroup.add(arm);

        // Đèn LED phát sáng ánh vàng ấm
        const bulb = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.08, 0.28),
          new THREE.MeshBasicMaterial({ color: 0xFEF3C7 })
        );
        bulb.position.set(pos[0] < 0 ? 1.5 : -1.5, 6.04, 0);
        lampGroup.add(bulb);

        const spotLight = new THREE.SpotLight(0xFFFBEB, 1.25, 22, Math.PI / 4, 0.5);
        spotLight.position.set(pos[0] < 0 ? 1.5 : -1.5, 6.0, 0);
        spotLight.target.position.set(pos[0] < 0 ? 4 : -4, 0, 0);
        spotLight.castShadow = true;
        lampGroup.add(spotLight);
        lampGroup.add(spotLight.target);

        smartGroup.add(lampGroup);
      });

      // ── 4. GỜ GIẢM TỐC 3D VÀNG - ĐEN (SPEED BUMPS) ──
      // Gờ giảm tốc cuối bãi
      for (let x = -4.0; x <= 4.0; x += 0.8) {
        const isYellow = Math.round(x) % 2 === 0;
        const bump = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.09, 0.6),
          new THREE.MeshStandardMaterial({ color: isYellow ? 0xFACC15 : 0x0F172A, roughness: 0.4 })
        );
        bump.position.set(x, 0.05, -18.5);
        smartGroup.add(bump);
      }

      // Gờ giảm tốc trước cổng vào (Làn IN rộng 4.1m tại z=18.2)
      for (let x = 1.5; x <= 5.1; x += 0.8) {
        const isYellow = Math.round(x * 10) % 2 === 0;
        const bump = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.09, 0.55),
          new THREE.MeshStandardMaterial({ color: isYellow ? 0xFACC15 : 0x0F172A, roughness: 0.4 })
        );
        bump.position.set(x, 0.05, 18.2);
        smartGroup.add(bump);
      }

      // Gờ giảm tốc sau cổng ra (Làn OUT rộng 4.1m tại z=10.2)
      for (let x = -5.1; x <= -1.5; x += 0.8) {
        const isYellow = Math.round(x * 10) % 2 === 0;
        const bump = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.09, 0.55),
          new THREE.MeshStandardMaterial({ color: isYellow ? 0xFACC15 : 0x0F172A, roughness: 0.4 })
        );
        bump.position.set(x, 0.05, 10.2);
        smartGroup.add(bump);
      }

      // ── 5. BỒN CÂY XANH TIỂU CẢNH ĐÔ THỊ (PLANTERS & HEDGES) ──
      const planterPositions = [
        [-14.8, 0, 4.0],
        [14.8, 0, 4.0],
        [-14.8, 0, 16.0],
        [14.8, 0, 16.0]
      ];
      planterPositions.forEach(pos => {
        const plGroup = new THREE.Group();
        plGroup.position.set(pos[0], pos[1], pos[2]);

        // Khung bồn xi măng trắng
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.55, 3.2),
          new THREE.MeshStandardMaterial({ color: 0xF1F5F9, roughness: 0.4 })
        );
        box.position.y = 0.27;
        box.castShadow = true;
        plGroup.add(box);

        // Bụi cây xanh cắt tỉa vuông vức
        const hedge = new THREE.Mesh(
          new THREE.BoxGeometry(1.3, 0.8, 2.9),
          new THREE.MeshStandardMaterial({ color: 0x15803D, roughness: 0.9 })
        );
        hedge.position.y = 0.8;
        hedge.castShadow = true;
        plGroup.add(hedge);

        smartGroup.add(plGroup);
      });

      this.scene.add(smartGroup);
    },

    /**
     * Cập nhật Bảng LED ma trận lớn ngoài cổng (VMS Screen)
     */
    updateVMSScreen(freeCount, totalCount) {
      if (!this.vmsCanvas) return;
      const ctx = this.vmsCanvas.getContext('2d');

      ctx.fillStyle = '#050D1A';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 8;
      ctx.strokeRect(6, 6, 500, 244);

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 30px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('● BÃI ĐỖ XE THÔNG MINH IOT', 256, 55);

      ctx.fillStyle = freeCount > 0 ? '#4ADE80' : '#EF4444';
      ctx.font = 'bold 46px "JetBrains Mono", monospace';
      ctx.fillText(`CHỖ TRỐNG: ${freeCount} / ${totalCount}`, 256, 130);

      ctx.fillStyle = '#FACC15';
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.fillText('TỐC ĐỘ GIỚI HẠN: ≤ 10 KM/H', 256, 195);

      if (this.vmsTexture) this.vmsTexture.needsUpdate = true;
    },

    /**
     * Xử lý sự kiện chuột & Resize
     */
    setupEvents() {
      const resizeObserver = new ResizeObserver(() => {
        if (!this.container || !this.renderer || !this.camera) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight || 480;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      });
      resizeObserver.observe(this.container);

      this.container.addEventListener('mousemove', (e) => {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      });

      this.container.addEventListener('click', () => {
        if (this.hoveredSlot) {
          window.location.href = 'parking.html';
        }
      });
    },

    /**
     * Vòng lặp Render Animation (60 FPS)
     */
    animate() {
      requestAnimationFrame(() => this.animate());

      const time = this.clock ? this.clock.getElapsedTime() : 0;

      // 1. Tự động xoay
      if (this.controls) {
        this.controls.autoRotate = this.autoRotate;
        this.controls.autoRotateSpeed = 1.0;
        this.controls.update();
      }

      // 2. Nâng hạ Barie mượt mà (Lerp)
      if (this.barrierArmIn) {
        this.barrierArmIn.rotation.z += (this.barrierInAngle - this.barrierArmIn.rotation.z) * 0.12;
      }
      if (this.barrierArmOut) {
        this.barrierArmOut.rotation.z += (this.barrierOutAngle - this.barrierArmOut.rotation.z) * 0.12;
      }

      // 3. Biển số xe nhấp nhô nhẹ nhàng
      Object.keys(this.carsGroup).forEach(code => {
        const car = this.carsGroup[code];
        if (car && car.visible) {
          const badge = car.getObjectByName('plateBadge');
          if (badge) {
            badge.position.y = 2.65 + Math.sin(time * 3 + code.charCodeAt(2)) * 0.05;
          }
        }
      });

      // 4. Raycasting kiểm tra hover
      if (this.raycaster && this.camera) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        let foundSlot = null;
        for (let i = 0; i < intersects.length; i++) {
          let obj = intersects[i].object;
          while (obj && obj !== this.scene) {
            if (obj.userData && obj.userData.slotCode) {
              foundSlot = obj.userData.slotCode;
              break;
            }
            obj = obj.parent;
          }
          if (foundSlot) break;
        }

        if (foundSlot !== this.hoveredSlot) {
          this.hoveredSlot = foundSlot;
          this.container.style.cursor = foundSlot ? 'pointer' : 'default';
        }
      }

      // 5. Render
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    },

    /**
     * CẬP NHẬT DỮ LIỆU REALTIME
     */
    updateSlots(slots) {
      if (!slots || !slots.length) return;
      this.slotsData = slots;
      if (!this.isInitialized) return;

      let freeCount = 0;

      slots.forEach(s => {
        const code = s.slot_code || s.slot_name || ('A0' + s.id);
        const isConflict = !!(s.is_conflict || (window._conflictSlots && window._conflictSlots[code]));
        const status = isConflict ? 'CONFLICT' : (s.status || 'FREE').toUpperCase();

        const car = this.carsGroup[code];
        const indicator = this.indicatorsGroup[code];

        if (status === 'FREE') {
          freeCount++;
          if (car) car.visible = false;
          if (indicator) {
            indicator.mesh.material.color.setHex(0x10B981);
            indicator.mesh.material.emissive.setHex(0x10B981);
            indicator.light.color.setHex(0x10B981);
          }
        } else if (status === 'OCCUPIED' || isConflict) {
          if (car) {
            car.visible = true;
            const plateText = isConflict
              ? (s.conflict_info?.wrong_plate || '⚠️ ĐỖ NHẦM')
              : (s.vehicle_plate || s.current_plate || '51A-123.45');

            const oldBadge = car.getObjectByName('plateBadge');
            if (oldBadge) car.remove(oldBadge);

            const newBadge = this.createPlateBadge(plateText);
            newBadge.name = 'plateBadge';
            newBadge.position.set(0, 2.65, 0);
            car.add(newBadge);
          }

          if (indicator) {
            const hex = isConflict ? 0xDC2626 : 0xEF4444;
            indicator.mesh.material.color.setHex(hex);
            indicator.mesh.material.emissive.setHex(hex);
            indicator.light.color.setHex(hex);
          }
        } else if (status === 'RESERVED') {
          if (car) {
            car.visible = true;
            const oldBadge = car.getObjectByName('plateBadge');
            if (oldBadge) car.remove(oldBadge);

            const newBadge = this.createPlateBadge('ĐÃ ĐẶT TRƯỚC');
            newBadge.name = 'plateBadge';
            newBadge.position.set(0, 2.65, 0);
            car.add(newBadge);
          }

          if (indicator) {
            indicator.mesh.material.color.setHex(0xF59E0B);
            indicator.mesh.material.emissive.setHex(0xF59E0B);
            indicator.light.color.setHex(0xF59E0B);
          }
        }
      });

      this.updateOledScreen(freeCount, slots.length);
    },

    setBarrier(gate, status) {
      if (!gate || !status) return;
      const g = String(gate).toLowerCase();
      const isOpen = String(status).toUpperCase() === 'OPEN';
      if (g === 'barrier_in' || g === 'in') {
        // Cần hướng về -X, xoay -Math.PI / 2 để dựng đứng lên trời 90 độ
        this.barrierInAngle = isOpen ? -Math.PI / 2 : 0;
      } else if (g === 'barrier_out' || g === 'out') {
        // Cần hướng về +X, xoay Math.PI / 2 để dựng đứng lên trời 90 độ
        this.barrierOutAngle = isOpen ? Math.PI / 2 : 0;
      } else if (g === 'all') {
        this.barrierInAngle = isOpen ? -Math.PI / 2 : 0;
        this.barrierOutAngle = isOpen ? Math.PI / 2 : 0;
      }
    },

    setCameraView(viewType) {
      if (!this.camera || !this.controls) return;
      this.autoRotate = false;

      if (viewType === 'isometric') {
        this.camera.position.set(26, 30, 32);
        this.controls.target.set(0, 0, 1.5);
      } else if (viewType === 'top') {
        this.camera.position.set(0, 48, 0.1);
        this.controls.target.set(0, 0, 0);
      } else if (viewType === 'gate') {
        this.camera.position.set(11, 8.5, 23.5);
        this.controls.target.set(0, 1.4, 13.5);
      }
    },

    toggleAutoRotate() {
      this.autoRotate = !this.autoRotate;
      return this.autoRotate;
    },

    drawRoundedRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }
  };

  window.Parking3D = Parking3D;
})();
