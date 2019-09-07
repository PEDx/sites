const svs = 'attribute vec4 a_position; uniform mat4 u_vpMatrix; uniform mat4 u_modelMatrix; void main() { gl_Position = u_vpMatrix * u_modelMatrix * a_position; }';
const sfs = 'precision highp float; const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0); const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0); vec4 pack (float depth) { vec4 rgbaDepth = fract(depth * bitShift); rgbaDepth -= rgbaDepth.gbaa * bitMask; return rgbaDepth; } void main() { gl_FragColor = pack(gl_FragCoord.z); }';
const vs = 'attribute vec4 a_position; attribute vec4 a_normal; uniform mat4 u_modelMatrix; uniform mat4 u_vpMatrix; uniform mat4 u_vpMatrixFromLight; uniform mat4 u_normalMatrix; varying vec4 v_positionFromLight; varying vec4 v_position; varying vec3 v_normal; void main() { gl_Position = u_vpMatrix * u_modelMatrix * a_position; v_positionFromLight = u_vpMatrixFromLight * u_modelMatrix * a_position; v_position = u_modelMatrix * a_position; v_normal = vec3(u_normalMatrix * a_normal); }';
const fs = 'precision highp float; uniform vec3 u_lightColor; uniform vec3 u_lightPosition; uniform vec3 u_lightDirection; uniform vec3 u_ambientColor; uniform vec3 u_viewPosition; uniform vec3 u_color; uniform sampler2D u_shadowMap; const float shininess = 50.0; const vec3 specularColor = vec3(1.0,1.0,1.0); varying vec4 v_positionFromLight; varying vec4 v_position; varying vec3 v_normal; const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0 * 256.0), 1.0/(256.0 * 256.0 * 256.0)); float unpackDepth(const in vec4 rgbaDepth) { return dot(rgbaDepth,bitShift); } float texture2DCompare(sampler2D depths, vec2 uv, float compare){ float depth = unpackDepth(texture2D(depths,uv)); return step(compare, depth); } float pcf(sampler2D shadowMap,vec4 position,float bias) { float shadows = 0.0; float opacity = 0.4; float texelSize = 1.0/2048.0; vec3 shadowCoord = (position.xyz/position.w)/2.0 + 0.5; for(float y=-1.5; y <= 1.5; y += 1.0){ for(float x=-1.5; x <=1.5; x += 1.0){ shadows += texture2DCompare(shadowMap, shadowCoord.xy + vec2(x,y) * texelSize, shadowCoord.z - bias); } } shadows /= 16.0; return min(opacity + shadows, 1.0); } void main() { vec3 normal = normalize(v_normal); vec3 surfaceToLightDirection = normalize(u_lightPosition - v_position.xyz); float cosTheta = max(dot(surfaceToLightDirection, normal), 0.0); float limit = cos(radians(25.0)); float outerLimit = cos(radians(25.0)); float innerLimit = cos(radians(20.0)); float dotFromDirection = dot(surfaceToLightDirection, u_lightDirection); float inlightBloom = smoothstep(outerLimit, innerLimit, dotFromDirection); float inLight = step(limit, dotFromDirection); vec3 ambient = u_ambientColor * u_color; vec3 diffuse = u_lightColor * u_color * cosTheta * inlightBloom; vec3 viewDirection = normalize(u_viewPosition - v_position.xyz); vec3 halfwayDir = normalize(surfaceToLightDirection + viewDirection); float specularIntensity = pow(max(dot(normal, halfwayDir), 0.0), shininess); vec3 specular = specularColor * specularIntensity * inlightBloom; float bias = max(0.05 * (1.0 - cosTheta),0.005); float shadow = dotFromDirection > limit ? pcf(u_shadowMap,v_positionFromLight,bias) : 1.0 ; gl_FragColor = vec4(ambient + (diffuse + specular) * shadow , 1.0); }';

var canvas = document.getElementById('canvas'),
    viewAngleX=0,
    viewAngleY=15,
    cViewAngleX=0,
    cViewAngleY=0,
    viewLEN=12,
    LENPERCENT = 1,
    LIGHT_POS=[0,3,6],
    LIGHT_DIR=[0,3,6],
    CENTER = { x: canvas.width / 2, y: canvas.height / 2 },
    START = {},
    FBO_WIDTH = 2048,
    FBO_HEIGHT = 2048;

var xEle = document.getElementById('x'),
    yEle = document.getElementById('y'),
    xaEle = document.getElementById('xan'),
    yaEle = document.getElementById('yan'),
    xt = document.getElementById('xt'),
    yt = document.getElementById('yt'),
    xat = document.getElementById('xat'),
    yat = document.getElementById('yat'),
    xdeg = 0,
    ydeg = 0;

xEle.oninput = function(e){
    xt.innerText = LIGHT_POS[0] = Number(this.value);
}   

yEle.oninput = function(e){
    yt.innerText = LIGHT_POS[1] = Number(this.value);
}

xaEle.oninput = function(e){
    xat.innerText = xdeg = Number(this.value);
    caculateDir();
}

yaEle.oninput = function(e){
    yat.innerText = ydeg = Number(this.value);
    caculateDir();
}

caculateDir();

//计算光源方向
function caculateDir(){
    var mat = new Matrix4();
    mat.setRotate(-xdeg,1,0,0);
    mat.rotate(-ydeg,0,1,0);
    LIGHT_DIR = mat.multiplyVector3(new Vector3(LIGHT_POS)).normalize().elements;
    console.log(LIGHT_DIR);
}

var gl = get3DContext(canvas,true);
// 初始化阴影着色器,创建对应program
var shadowProgram = createProgramInfo(gl, svs, sfs);
// 初始化普通着色器,创建对应program
var normalProgram = createProgramInfo(gl, vs, fs);

// 获取对应图形的缓冲区对象
var planeBuffer = createBufferInfoFromArrays(gl,Plane(5));
var cubeBuffer = createBufferInfoFromArrays(gl,Cube());
// 帧缓冲区对象 (FBO)  
var fbo = createFramebuffer(gl,{ w: FBO_WIDTH, h: FBO_HEIGHT });

var vpMatrixFromLight = new Matrix4(); // 光源处的视图投影矩阵
var vpMatrix = new Matrix4(); // 当前视点的视图投影矩阵
var modelMatrix = new Matrix4();// 模型矩阵
var normalMatrix = new Matrix4();// 向量矩阵

gl.clearColor(0, 0, 0, 1);
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

var angle = 29,ANGLE_STEP = 40, last = Date.now();

(function animate(){
    var now = new Date(), elapsed = now - last;

    last = now;
    angle += ANGLE_STEP * elapsed / 1000;
    angle %= 360;

    var angleX=(viewAngleX+cViewAngleX)%360;
        angleY=viewAngleY+cViewAngleY,
        len=viewLEN*LENPERCENT;

    angleY = angleY>90?90:angleY<10?10:angleY;
    len = len >30 ? 30 : len < 6 ? 6 : len;

    var eyeY=len*Math.sin(angleY*Math.PI/180),
        c=len*Math.cos(angleY*Math.PI/180),
        eyeX=c*Math.sin(angleX*Math.PI/180),
        eyeZ=c*Math.cos(angleX*Math.PI/180);

    vpMatrixFromLight.setPerspective(45, FBO_WIDTH / FBO_HEIGHT, 1, 100);
    vpMatrixFromLight.lookAt(...LIGHT_POS, 0, 0, 0, 0, 1, 0);

    vpMatrix.setPerspective(35, canvas.width / canvas.height, 1, 100);
    vpMatrix.lookAt(eyeX,eyeY,eyeZ, 0, 0, 0, 0, 1, 0);
    modelMatrix.rotate(0.5, 0, 1, 0);
    /*
    * 帧缓存
    */ 
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); // 切换绘制场景为帧缓冲区  
    gl.viewport(0, 0, FBO_WIDTH, FBO_HEIGHT); // 设置帧绘图区域
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear FBO    
    gl.useProgram(shadowProgram.program);
    // 绘制立方体
    drawCube(shadowProgram);
    // 绘制平面
    drawPlane(shadowProgram);
    
    /*
    * 切换为正常的缓冲区 
    */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);//设置绘图区域
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);// clear color and depth
    gl.useProgram(normalProgram.program);
    setUniforms(normalProgram,{
        u_shadowMap: 0, // 传递0号纹理:gl.TEXTURE0
        u_lightColor: [1,1,1],// 光照颜色
        u_lightPosition: LIGHT_POS, // 光线方向(世界坐标系下)
        u_lightDirection: LIGHT_DIR,
        u_ambientColor:[0.3,0.3,0.3], // 环境光颜色
        u_viewPosition:[eyeX,eyeY,eyeZ]
    });
    // 绘制立方体        
    drawCube(normalProgram);
    // 绘制平面
    drawPlane(normalProgram);
    
    requestAnimationFrame(animate);
}());

function drawCube(program){
    modelMatrix.setTranslate( 0, 2, 2);
    modelMatrix.rotate(angle, 0, 1, 0);
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    if(program == shadowProgram){
        setUniforms(program,{ 
            u_vpMatrix: vpMatrixFromLight.elements,
            u_modelMatrix: modelMatrix.elements
        });
    } else {
        setUniforms(program,{
            u_color: [0.9,0.3,0.3],
            u_vpMatrix: vpMatrix.elements,
            u_vpMatrixFromLight: vpMatrixFromLight.elements,
            u_modelMatrix: modelMatrix.elements,
            u_normalMatrix: normalMatrix.elements
        });
    }
    setBuffersAndAttributes(gl,program,cubeBuffer);
    drawBufferInfo(gl, cubeBuffer);
}

function drawPlane(program){
    modelMatrix.setIdentity();
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    if(program == shadowProgram){
        setUniforms(program,{ 
            u_vpMatrix: vpMatrixFromLight.elements,
            u_modelMatrix: modelMatrix.elements 
        });
    } else {
        setUniforms(program,{
            u_color: [0.6,0.6,0.6],
            u_vpMatrix: vpMatrix.elements,
            u_vpMatrixFromLight: vpMatrixFromLight.elements,
            u_modelMatrix: modelMatrix.elements,
            u_normalMatrix: normalMatrix.elements
        });
    }
    setBuffersAndAttributes(gl,program,planeBuffer);
    drawBufferInfo(gl, planeBuffer);
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