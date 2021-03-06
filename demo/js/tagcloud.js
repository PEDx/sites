function drawTags(){
    var arr=['javaScript','html','css','jQuery','angularJS','mvvm','mvc','nodeJS','html5','css3','canvas','webGL','svg','backboneJS','noSql','mongoDB','mySQL','android','ios','phoneGap','webApp','knockoutJS','bootStrap','chrome','firefox'],
        len=arr.length,
        tags=[],
        container=$('.container'),
        R=200,//半径
        angleX = Math.PI/500,//绕x轴的角度
        angleY = Math.PI/500,//绕y轴的角度
        CX=container.width()/2,
        CY=container.height()/2,
        EX = container.offset().left + document.body.scrollLeft + document.documentElement.scrollLeft,
        EY = container.offset().top + document.body.scrollTop + document.documentElement.scrollTop;

    function init(){
        for(var i=0;i<len;i++){
            var k = -1+(2*(i+1)-1)/len;
            var a = Math.acos(k);
            var b = a*Math.sqrt(len*Math.PI);
            // var a = Math.random()*2*Math.PI;
            // var b = Math.random()*2*Math.PI;
            var x = R * Math.sin(a) * Math.cos(b);
            var y = R * Math.sin(a) * Math.sin(b); 
            var z = R * Math.cos(a);
            var tagEle=$('<a href="#">'+arr[i]+'</a>').css('color','#'+getRandomColor());
            container.append(tagEle);
            var t = new tag(tagEle , x , y , z);
            tags.push(t);
            t.move();
        }
    }
    function tag(ele , x , y , z){
        this.ele=ele;
        this.x=x;
        this.y=y;
        this.z=z;
    }
    tag.prototype.move=function(){
        var scale = 2*R/(2*R-this.z);
        var alpha = (this.z+R)/(2*R);
        this.ele.css({
            'fontSize':14* scale + "px",
            'opacity':alpha+0.5,
            'zIndex':Math.floor(scale*100),
            'left':this.x + CX - this.ele.width()/2 +"px",
            'top':this.y + CY - this.ele.height()/2 +"px"
        });
    };
    //获取随机颜色值
    function getRandomColor(){
        var str=Math.ceil(Math.random()*16777215).toString(16);
        while(str.length<6){
            str='0'+str;
        }
        return str;
    }

    function rotateX(){
        var cos = Math.cos(angleX);
        var sin = Math.sin(angleX);
        $(tags).each(function(){
            var y1 = this.y * cos - this.z * sin;
            var z1 = this.z * cos + this.y * sin;
            this.y = y1;
            this.z = z1;
        });
    }

    function rotateY(){
        var cos = Math.cos(angleY);
        var sin = Math.sin(angleY);
        $(tags).each(function(){
            var x1 = this.x * cos - this.z * sin;
            var z1 = this.z * cos + this.x * sin;
            this.x = x1;
            this.z = z1;
        });
    }
    function action(){
        setInterval(function(){
            rotateX();
            rotateY();
            $(tags).each(function(){
                this.move();	
            });
        } , 20);
    }

    container.on('mousemove',function(event){
        var x = event.clientX - EX - CX;
        var y = event.clientY - EY - CY;
        angleY = x*0.0001;
        angleX = y*0.0001;
    });
    init();
    action();
}
drawTags();