// text with icon slider
if (window.matchMedia("(max-width: 1100px)").matches) {
  $(".carousel").slick({
    slidesToShow: 2,
    infinite: true,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    dots: false,
    arrows: false,
    prevArrow: "<button class='previousArrow'><span>prev</span></button>",
    nextArrow: "<button class='nextArrow'><span>next</span></button>",
    responsive: [
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  });
}

// media with text carousel
$(".media-carousel").slick({
  slidesToShow: 1,
  infinite: true,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 5000,
  dots: true,
  arrows: false,
  prevArrow: "<button class='previousArrow'><span>prev</span></button>",
  nextArrow: "<button class='nextArrow'><span>next</span></button>",
  customPaging: function (slider, i) {
    // Return custom HTML for each dot, for example, a simple dot
    return '<button class="dot"></button>';
  }
});

let arrow = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="26" height="26" viewBox="0 0 26 26" fill="none">
<rect width="26" height="26" fill="url(#pattern0_19_290)"/>
<defs>
<pattern id="pattern0_19_290" patternContentUnits="objectBoundingBox" width="1" height="1">
<use xlink:href="#image0_19_290" transform="scale(0.0078125)"/>
</pattern>
<image id="image0_19_290" width="128" height="128" preserveAspectRatio="none" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAABWpJREFUeJztnc+LVWUch5/3zFXRlH5szAihRQW1KbBNajmWis3YaGC7cpog2syiTWv/g6BFgeBYjBiYQTedsVCwFkKLIVsVBcU4BmGEClpRzj2nhTOmNnPn3nvO+33POe/nWZ/zfl74PPc9PznXURZGjm8i5U0czwD3A5fJ+BbnjnDtz8N8/HIr9BTriAs9AUYnV3Ct9R4w0marcyTJHg4OnLeaViyEFWDv0ZWsXtWEbNuS22b8SpL2Mzb0g8HMoiGcAKOTK7ja+gTHQBd7XYTWVg7t/s7bvCIjjAC9lT+PJCgQewHylT+PJCiIxDRt79E+rrWO5SwfYC1Z32lGmo8WMq+IsRVg9cq3gcFCxnKsI03OSIJ82B0CRppryJILwN2Fjqurg1wYrgBuO0WXD1oJcmInQMbj3sZ2rCNLvuK1Tx/zllFTDFeAZLnnAJ0Y9oCdAC77xX+GDgfdYidAq+8UkHnPkQRdYSfAhy/8BO4zkyydE3SM7X0AZkeBi0ZhOifoAFsBDu2+gEsHgSsmeTocLEmYh0GvN58kTU4D9xkl6tnBIoR7HCwJSkHYF0IkQXDCvxImCYISXgCQBAEphwAgCQJRHgFAEgSgXAKAJDCmfAKAJDCknAKAJDCivAKAJDCg3AKAJPBM+QUASeCRaggAksAT1REAJIEHqiUASIKCqZ4AIAkKpJoCgCQoiOoKAJKgAKotAEiCnFRfAJAEOaiHACAJeqQ+AoAk6IF6CQCSoEvqJwBIgi6opwAgCTqkvgKAJOiAegsAkmAJ6i8ASII2xCEASIJFiEcAkAQLEJcAIAnuID4BQBLcQpwCgCSYI14BQBIQuwAQvQQSAKKWQALME6kEEuBWIpRAAtxJZBJIgIWISAIJsBiRSCAB2mEvwQyz159i/KXfjPKsPxZdMQ4OncOlO7D6tjGsp7HsXaMsQCtAZ4w0N5Alp4B7DNIy0r6Hb3xe3z9aATphbGgKl27DZiVwJK2dBjmABOicsaEpknQrcMl7luMh7xlzSIBumGUVsMx7TkrLe8YcDaugyjN8YjMumwRWe89K+Nl7xs0osTSW5UMLl5w0yAEkwNLYlg9wmIMD542yJEBbrMt3/Mjf7i2TrDkkwGLsa27EZRPY/fJnwO3kyOBlozxAN4IWZl9zI0lyElhjlDiDc/2MDZqd/M0jAe4kovJBAtxOZOWDBPiPCMsHCXCDSMsHCRB1+RC7AJGXDzELoPKBWAVQ+TeJTwCVfxtxCaDy/0c8Aqj8BYlDAJW/KPUXQOW3pd4CqPwlqa8AKr8j6imAyu+Y+gmg8ruiXgKo/K6pjwAqvyfqIYDK75nqC6Dyc1FtAVR+bqorgMovhGoKoPILo3oCqPxCqZYAKr9wqiOAyvdCNQRQ+d4ovwAq3yvlFkDle6e8Aqh8E8opgMo3o3wCqHxTyiWAyjenPAKo/CCUQwCVH4zwAqj8oIQVQOUHJ5wAKr8UhBFA5ZcG+y+FDp/YTJJ8jln5bpps9lmVvzC2K8CrE4/QSL8m416bQDdNdr2fD/ZM2+RVD9sVoC993658ZnA8p/LbY7cCDE88gUvP2YTpl98pdiuAaz1vFKTyu8DwEOAeNMhQ+V1iJ0DGX54TdMzvATsBEr73N7gu9XrFToAGk+BjFdCynwc7AQ7s+h2XvVPsoCo/L7b3ARoP7AfOFDOYyi8CWwEObLjO7PJdwJc5R9IJX0GEeRj0yhd30fjnBLClh731YKdAwj0O7k0ClV8w4f43cHzHH7j0RZw729kOutTzQdg/jhwbukoj2w7uo7bbOXeWZY2ndcwvnvDvBM4zfHwLzr0B2SZgLXAJmMJl46z/5hj796eBZ1hL/gXQ8w7x+6h2rwAAAABJRU5ErkJggg=="/>
</defs>
</svg>
`

// testimonial grid
$(".testimonial-slider").slick({
  slidesToShow: 3,
  infinite: true,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 5000,
  dots: false,
  arrows: true,
  prevArrow: `<button class='previousArrow'><span>${ arrow }</span></button>`,
  nextArrow: `<button class='nextArrow'><span>${ arrow }</span></button>`,
  responsive: [
    {
      breakpoint: 1100,
      settings: {
        slidesToShow: 2,
      }
    },
    {
      breakpoint: 767,
      settings: {
        slidesToShow: 1,
      }
    }
  ]
});