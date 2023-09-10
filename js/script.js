$(window).on("load",function(){
    $(".loader .inner").fadeOut(500, function (){
        $(".loader").fadeOut(750);
    }); 
})


$(document).ready(function () {
    $('#slides').superslides({
        animation: "fade",
        play: 3000,
        pagination: false
    });

    var typed = new Typed(".typed", {
        strings: ["Developer", "Innovator", "Blogger", "Creator"],
        typeSpeed: 80,
        loop: true,
        startDelay: 1000,
        showCursor: false
    });
    
    $(document).ready(function(){
        $('.carousel').carousel();
    });
    $('.owl-carousel').owlCarousel({
        loop: true,
        items: 5,
        responsive: {
            0: {
                items: 1
            },
            480: {
                items: 2
            },
            768: {
                items: 3
            },
            938: {
                items: 4
            },
            1100: {
                items: 5
            }
        }
    });
    
    


    //var skillsTopOffset = $(".skillSection").offset().top;
    var statsTopOffset = $(".statsSection").offset().top;
    var countupFinished = false;
    $(window).scroll(function () {


       
        if (!countupFinished && window.pageYOffset > statsTopOffset - $(window).height() + 200) {

            $(".counter").each(function () {
                var element = $(this);
                var endVal = parseInt(element.text());
                element.countup(endVal)
            })
            countupFinished = true;
        }
    });


        $("#navigation li a").click(function(e){
            e.preventDefault();

            var targetElement = $(this).attr("href");
            var targetPosition = $(targetElement).offset().top;
            $("html,body").animate({scrollTop:targetPosition  -50 }, "slow");

        });

    const nav = $("#navigation");
    const navTop = nav.offset().top;
    $(window).on("scroll", stickyNavigation);
    function stickyNavigation() {
        var body = $("body");
        if ($(window).scrollTop() >= navTop) {
            body.css("padding-top", nav.outerHeight() + "px");
            body.addClass("fixedNav");

        }
        else {
            body.css("padding-top", 0);
            body.removeClass("fixedNav");
        }
    }

});