
const svs = 'attribute vec4 a_position; uniform mat4 u_vpMatrix; uniform mat4 u_modelMatrix; void main() { gl_Position = u_vpMatrix * u_modelMatrix * a_position; }';
const sfs = 'precision highp float; vec4 pack (float depth) { const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0); const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0); vec4 rgbaDepth = fract(depth * bitShift); rgbaDepth -= rgbaDepth.gbaa * bitMask; return rgbaDepth; } void main() { gl_FragColor = pack(gl_FragCoord.z); }';
const vs = 'attribute vec4 a_position; attribute vec4 a_normal; uniform mat4 u_modelMatrix; uniform mat4 u_vpMatrix; uniform mat4 u_vpMatrixFromLight; uniform mat4 u_normalMatrix; varying vec4 v_positionFromLight; varying vec3 v_position; varying vec3 v_normal; void main() { gl_Position = u_vpMatrix * u_modelMatrix * a_position; v_positionFromLight = u_vpMatrixFromLight * u_modelMatrix * a_position; v_position = vec3(u_modelMatrix * a_position); v_normal = vec3(u_normalMatrix * a_normal); }';
const fs = 'precision mediump float; uniform vec3 u_lightColor; uniform vec3 u_lightPosition; uniform vec3 u_ambientColor; uniform vec3 u_viewPosition; uniform sampler2D u_shadowMap; uniform vec3 u_color; varying vec4 v_positionFromLight; varying vec3 v_position; varying vec3 v_normal; float unpack(const in vec4 rgbaDepth) { const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0)); return dot(rgbaDepth, bitShift); } float pcf(float cosTheta,vec4 position) { float shadows = 0.0; float opacity = 0.4; float texelSize = 1.0/2048.0; vec4 rgbaDepth; vec3 shadowCoord = (position.xyz/position.w)/2.0 + 0.5; float bias = 0.005 * tan(acos(cosTheta)); bias = clamp(bias, 0.0015, 0.01); for(float y=-1.5; y <= 1.5; y += 1.0){ for(float x=-1.5; x <=1.5; x += 1.0){ rgbaDepth = texture2D(u_shadowMap, shadowCoord.xy + vec2(x,y) * texelSize); shadows += step(shadowCoord.z - bias, unpack(rgbaDepth)); } } shadows /= 16.0; return min(opacity + shadows, 1.0); } void main() { vec3 normal = normalize(v_normal); vec3 lightDirection = normalize(u_lightPosition - v_position); float cosTheta = max(dot(lightDirection, normal), 0.0); vec3 diffuse = u_lightColor * u_color.rgb * cosTheta; vec3 ambient = u_ambientColor * u_color.rgb; float shininess =50.0; vec3 specularColor = vec3(1.0,1.0,1.0); vec3 viewDirection = normalize(u_viewPosition-v_position); vec3 halfwayDir = normalize(lightDirection + viewDirection); float specularIntensity = pow(max(dot(normal, halfwayDir), 0.0), shininess); vec3 specular = specularColor.rgb * specularIntensity; float shadow = pcf(cosTheta,v_positionFromLight); specular *= step(shadow, 1.0); gl_FragColor = vec4(ambient + (diffuse + specular) * shadow, 1.0); }';
var canvas = document.getElementById('canvas'),
    OFFSCREEN_WIDTH = 2048,
    OFFSCREEN_HEIGHT = 2048,
    viewAngleX=-10,
    viewAngleY=30,
    cViewAngleX=0,
    cViewAngleY=0,
    viewLEN=20,
    LENPERCENT = 1,
    LIGHT_POS=[2,8,9],//光源位置
    CENTER = { x: canvas.width / 2, y: canvas.height / 2 },
    START = {};

    var gl = get3DContext(canvas);
    // 创建帧缓冲区对象 (FBO)  
    var fbo = createFramebuffer(gl,{ w: OFFSCREEN_WIDTH, h: OFFSCREEN_HEIGHT });
    // 初始化阴影着色器,创建对应program
    var shadowProgram=createProgramInfo(gl,svs,sfs);
    // 初始化普通着色器,创建对应program
    var normalProgram=createProgramInfo(gl,vs,fs);
    // 获取对应图形的缓冲区对象
    var planeBuffers = createBufferInfoFromArrays(gl,Plane(8));
    var cubeBuffers = createBufferInfoFromArrays(gl,Cube());
    var sphereBuffers = createBufferInfoFromArrays(gl,Sphere(1,50,));
    var cylinderBuffers = createBufferInfoFromArrays(gl,Cylinder(0.8,4,40));
    var coneBuffers = createBufferInfoFromArrays(gl,Cone(1,4,40));

    gl.clearColor(0, 0, 0, 1);//设置背景颜色
    gl.enable(gl.DEPTH_TEST);//深度测试
    gl.enable(gl.CULL_FACE);//剔除背面
    
    var vpMatrixFromLight = new Matrix4(); // 光源处观察的视图投影矩阵
    var vpMatrix = new Matrix4(); // 当前视点观测的视图投影矩阵
    var modelMatrix = new Matrix4();// 模型矩阵
    var normalMatrix = new Matrix4();// 向量矩阵
    vpMatrixFromLight.setPerspective(90, OFFSCREEN_WIDTH / OFFSCREEN_HEIGHT, 1.0, 100.0);
    vpMatrixFromLight.lookAt(...LIGHT_POS, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

    var angle=29,ANGLE_STEP = 40, last = Date.now();
    (function animate(){
        var now = new Date(),
            elapsed = now - last;

        last = now;
        angle += ANGLE_STEP * elapsed / 1000;
        angle %= 360;

        var angleX=(viewAngleX+cViewAngleX)%360;
            angleY=viewAngleY+cViewAngleY,
            len=viewLEN*LENPERCENT;
        angleY=angleY>90?90:angleY<10?10:angleY;
        len=len>30?30:len<4?4:len;

        var eyeY=len*Math.sin(angleY*Math.PI/180),
            c=len*Math.cos(angleY*Math.PI/180),
            eyeX=c*Math.sin(angleX*Math.PI/180),
            eyeZ=c*Math.cos(angleX*Math.PI/180);

        vpMatrix.setPerspective(30, canvas.width / canvas.height, 1.0, 100.0);
        vpMatrix.lookAt(eyeX,eyeY,eyeZ, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
        /*
        * 帧缓冲
        */
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); // 切换绘制场景为帧缓冲区  
        gl.viewport(0, 0, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT); // 设置帧绘图区域
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // 清空颜色缓冲和深度缓冲
        gl.useProgram(shadowProgram.program);    
        // 绘制物体
        drawCone(shadowProgram);
        drawCylinder(shadowProgram);
        drawSphere(shadowProgram);
        drawCube(shadowProgram);
        // 绘制平面
        drawPlane(shadowProgram);
        
        /*
        * 正常缓冲
        */
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);//解除绑定帧缓冲区，即切换为正常的缓冲区
        gl.viewport(0, 0, canvas.width, canvas.height);//设置绘图区域
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);// 清空颜色缓冲和深度缓冲
        gl.useProgram(normalProgram.program);

        setUniforms(normalProgram,{
            u_shadowMap: 0, // 传递0号纹理:gl.TEXTURE0
            u_lightColor: [1,1,1],// 光照颜色
            u_lightPosition: LIGHT_POS, // 光线方向
            u_ambientColor:[0.2,0.2,0.2], // 环境光颜色
            u_viewPosition:[eyeX,eyeY,eyeZ]
        });
        
        // 绘制物体
        drawCone(normalProgram);
        drawCylinder(normalProgram);
        drawSphere(normalProgram);
        drawCube(normalProgram);
        // 绘制平面
        drawPlane(normalProgram,vpMatrix);
        
        requestAnimationFrame(animate);
    }());

    function drawCone(program){
        modelMatrix.setTranslate( -3, 2, -3);
        modelMatrix.rotate(angle, 1, 0, 0);
        normalMatrix.setInverseOf(modelMatrix);
        normalMatrix.transpose();

        if(program==shadowProgram){
            setUniforms(program,{
                u_vpMatrix: vpMatrixFromLight.elements,
                u_modelMatrix: modelMatrix.elements
            });
        } else {
            setUniforms(program,{
                u_color: [0.9,0.9,0.1],
                u_vpMatrix: vpMatrix.elements,
                u_vpMatrixFromLight: vpMatrixFromLight.elements,
                u_modelMatrix: modelMatrix.elements,
                u_normalMatrix: normalMatrix.elements
            });
        }
        setBuffersAndAttributes(gl,program,coneBuffers);
        drawBufferInfo(gl,coneBuffers);
    }

    function drawCylinder(program){
        modelMatrix.setTranslate( 0, 2, 0);
        normalMatrix.setInverseOf(modelMatrix);
        normalMatrix.transpose();

        if(program==shadowProgram){
            setUniforms(program,{
                u_vpMatrix: vpMatrixFromLight.elements,
                u_modelMatrix: modelMatrix.elements
            });
        } else {
            setUniforms(program,{
                u_color: [0.2,0.2,0.8],
                u_vpMatrix: vpMatrix.elements,
                u_vpMatrixFromLight: vpMatrixFromLight.elements,
                u_modelMatrix: modelMatrix.elements,
                u_normalMatrix: normalMatrix.elements
            });
        }
        setBuffersAndAttributes(gl,program,cylinderBuffers);
        drawBufferInfo(gl,cylinderBuffers);
    }

    function drawSphere(program){
        modelMatrix.setRotate(angle, 0, 1, 0);
        modelMatrix.translate( 1.5, 2, 1.5);
        normalMatrix.setInverseOf(modelMatrix);
        normalMatrix.transpose();

        if(program==shadowProgram){
            setUniforms(program,{
                u_vpMatrix: vpMatrixFromLight.elements,
                u_modelMatrix: modelMatrix.elements
            });
        } else {
            setUniforms(program,{
                u_color:[0.2,0.8,0.2],
                u_vpMatrix: vpMatrix.elements,
                u_vpMatrixFromLight: vpMatrixFromLight.elements,
                u_modelMatrix: modelMatrix.elements,
                u_normalMatrix: normalMatrix.elements
            });
        }
        setBuffersAndAttributes(gl,program,sphereBuffers);
        drawBufferInfo(gl,sphereBuffers);
    }

    function drawCube(program){
        modelMatrix.setTranslate( 3.5, 2, 3);
        modelMatrix.rotate(angle, 0, 1, 0);
        normalMatrix.setInverseOf(modelMatrix);
        normalMatrix.transpose();

        if(program==shadowProgram){
            setUniforms(program,{
                u_vpMatrix: vpMatrixFromLight.elements,
                u_modelMatrix: modelMatrix.elements
            });
        } else {
            setUniforms(program,{
                u_color:[0.8,0.1,0.3],
                u_vpMatrix: vpMatrix.elements,
                u_vpMatrixFromLight: vpMatrixFromLight.elements,
                u_modelMatrix: modelMatrix.elements,
                u_normalMatrix: normalMatrix.elements
            });
        }
        setBuffersAndAttributes(gl,program,cubeBuffers);
        drawBufferInfo(gl,cubeBuffers);
    }

    function drawPlane(program){
        modelMatrix.setTranslate(0,0,-2);
        normalMatrix.setInverseOf(modelMatrix);
        normalMatrix.transpose();
        if(program==shadowProgram){
            setUniforms(program,{
                u_vpMatrix: vpMatrixFromLight.elements,
                u_modelMatrix: modelMatrix.elements
            });
        } else {
            setUniforms(program,{
                u_color: [1,1,1],
                u_vpMatrix: vpMatrix.elements,
                u_vpMatrixFromLight: vpMatrixFromLight.elements,
                u_modelMatrix: modelMatrix.elements,
                u_normalMatrix: normalMatrix.elements
            });
        }
        setBuffersAndAttributes(gl,program,planeBuffers);
        drawBufferInfo(gl,planeBuffers);
    }


    canvas.addEventListener('mousedown', function(e) {
        START = windowToCanvas(canvas, e.clientX, e.clientY);
        canvas.addEventListener('mousemove', mouseMove, false);
        canvas.addEventListener('mouseup', mouseUp, false);
        canvas.addEventListener('mouseout', mouseUp, false);
    }, false);

    function mouseMove(e) {
        var end = windowToCanvas(canvas, e.clientX, e.clientY),
            a = Math.sqrt(Math.pow(START.x - CENTER.x, 2) + Math.pow(START.y - CENTER.y, 2)),
            b = Math.sqrt(Math.pow(end.x - CENTER.x, 2) + Math.pow(end.y - CENTER.y, 2)),
            radX = (START.x - end.x) * 0.01,
            radY = (end.y - START.y) * 0.01;

        cViewAngleX = radX * 180 / Math.PI;
        cViewAngleY = radY * 180 / Math.PI;
        cViewAngleY > 90 ? 90 : cViewAngleY < -90 ? -90 : cViewAngleY;
        LENPERCENT = b / a;
    }

    function mouseUp(e) {
        viewAngleX += cViewAngleX;
        cViewAngleX = 0;
        viewAngleY += cViewAngleY;
        cViewAngleY = 0;
        viewLEN *= LENPERCENT;
        LENPERCENT = 1;
        canvas.removeEventListener('mouseup', arguments.callee, false);
        canvas.removeEventListener('mousemove', mouseMove, false);
        canvas.removeEventListener('mouseout', mouseUp, false);
    }