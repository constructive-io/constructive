export default (message = "We’re really sorry about that. The service you were looking for doesn't exist.", html='') => `
<html lang="en">

<head>
    <META HTTP-EQUIV="CACHE-CONTROL" CONTENT="NO-CACHE">
    <META NAME="ROBOTS" CONTENT="NOINDEX, NOFOLLOW">
    <META NAME="GOOGLEBOT" CONTENT="NOARCHIVE">
    <title>Not Found</title>

    <link href='//fonts.googleapis.com/css2?family=Fjalla+One&display=swap' rel='stylesheet' type='text/css'>

    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .text-brand {
            color: #01a1ff;
        }
        .text-brand:hover {
            text-decoration: underline;
        }
        h1.text-brand:hover {
            text-decoration: none;
        }
    </style>

    <style type="text/css">
        .fade-in-cls {
            -webkit-animation: fade-in 2s 0.2s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);
            -moz-animation: fade-in 2s 0.2s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);
            animation: fade-in 2s 0.2s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);
            -webkit-transform: translateY(10px);
            -moz-transform: translateY(10px);
            -o-transform: translateY(10px);
            transform: translateY(10px);
            -webkit-opacity: 0;
            -moz-opacity: 0;
            opacity: 0;
        }

        @-webkit-keyframes fade-in {
            100% {
                -webkit-transform: translateY(0px);
                -moz-transform: translateY(0px);
                -o-transform: translateY(0px);
                transform: translateY(0px);
                -webkit-opacity: 1;
                -moz-opacity: 1;
                opacity: 1;
            }
        }

        @-moz-keyframes fade-in {
            100% {
                -webkit-transform: translateY(0px);
                -moz-transform: translateY(0px);
                -o-transform: translateY(0px);
                transform: translateY(0px);
                -webkit-opacity: 1;
                -moz-opacity: 1;
                opacity: 1;
            }
        }

        @keyframes fade-in {
            100% {
                -webkit-transform: translateY(0px);
                -moz-transform: translateY(0px);
                -o-transform: translateY(0px);
                transform: translateY(0px);
                -webkit-opacity: 1;
                -moz-opacity: 1;
                opacity: 1;
            }
        }

        .time {

            -webkit-animation: ckw 15s infinite;
            /* Safari 4+ */
            -moz-animation: ckw 15s infinite;
            /* Fx 5+ */
            -o-animation: ckw 15s infinite;
            /* Opera 12+ */
            animation: ckw 15s infinite;
            /* IE 10+, Fx 29+ */
            -webkit-animation-timing-function: linear;
            /* Chrome, Safari, Opera */
            animation-timing-function: linear;
            transform-origin: 50% 50%;
            display: inline-block;
            /* <--- */
        }

        @keyframes ckw {
            0% {
                transform: rotate(0deg);
                -webkit-transform: rotate(0deg);
                -moz-transform: rotate(0deg);
                -o-transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
                -webkit-transform: rotate(360deg);
                -moz-transform: rotate(360deg);
                -o-transform: rotate(360deg);
            }
        }

        @-webkit-keyframes ckw {
            0% {
                transform: rotate(0deg);
                -webkit-transform: rotate(0deg);
                -moz-transform: rotate(0deg);
                -o-transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
                -webkit-transform: rotate(360deg);
                -moz-transform: rotate(360deg);
                -o-transform: rotate(360deg);
            }
        }

        @-moz-keyframes ckw {
            0% {
                transform: rotate(0deg);
                -webkit-transform: rotate(0deg);
                -moz-transform: rotate(0deg);
                -o-transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
                -webkit-transform: rotate(360deg);
                -moz-transform: rotate(360deg);
                -o-transform: rotate(360deg);
            }
        }

        body {
            background-color: #F3F6FA;
            color: #01A1FF;
            font-family: 'Fjalla One', sans-serif;
            position: relative;
            margin: 0px;
        }

        section {
            width: 100%;
            height: 100%;
            position: absolute;
        }

        article {
            display: table;
            width: 100%;
            height: 100%;
        }

        /* .border-top {
            width: 95px;
            background-color: #fff;
            height: 2px;
            display: inline-block;
            margin: 0px auto;
        } */

        .vcntr {
            display: table-cell;
            height: 100%;
            width: 100%;
            vertical-align: middle;
        }

        .logo {
            width: 100px;
            margin: 10px auto;
            display: block;
        }

        h1 {
            font-size: 21px;
            line-height: 32px;
            margin-bottom: 0px;
            margin-top: 28px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        p {
            font-size: 16px;
            line-height: 23px;
            margin-bottom: 8px;
            margin-top: 6px;
        }

        .textc {
            text-align: center;
        }

        @media only screen and (max-width:480px) {
            .logo {
                width: 100px;
            }
        }
    </style>
</head>

<body class="">
    <section>
        <article>
            <div class="vcntr">
                <div class="logo">
                <svg viewBox="-115 -900 440 1450" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    @keyframes cube0 {
      0%, 0% { transform: translate(0.0px, -600.0px) rotate(0.0deg) scale(1.00); opacity: 0; }
      35.7%, 100% { transform: translate(0.0px, 0.0px) rotate(0.0deg) scale(1.00); opacity: 1; }
    }
    @keyframes cube1 {
      0%, 8.6% { transform: translate(0.0px, -680.0px) rotate(0.0deg) scale(1.00); opacity: 0; }
      44.3%, 100% { transform: translate(0.0px, 0.0px) rotate(0.0deg) scale(1.00); opacity: 1; }
    }
    @keyframes cube2 {
      0%, 17.1% { transform: translate(0.0px, -760.0px) rotate(0.0deg) scale(1.00); opacity: 0; }
      52.9%, 100% { transform: translate(0.0px, 0.0px) rotate(0.0deg) scale(1.00); opacity: 1; }
    }
    @keyframes cube3 {
      0%, 25.7% { transform: translate(0.0px, -840.0px) rotate(0.0deg) scale(1.00); opacity: 0; }
      61.4%, 100% { transform: translate(0.0px, 0.0px) rotate(0.0deg) scale(1.00); opacity: 1; }
    }
    @keyframes cube4 {
      0%, 34.3% { transform: translate(0.0px, -920.0px) rotate(0.0deg) scale(1.00); opacity: 0; }
      70%, 100% { transform: translate(0.0px, 0.0px) rotate(0.0deg) scale(1.00); opacity: 1; }
    }
    @keyframes cube5 {
      0%, 42.9% { transform: translate(0.0px, -1000.0px) rotate(0.0deg) scale(1.00); opacity: 0; }
      78.6%, 100% { transform: translate(0.0px, 0.0px) rotate(0.0deg) scale(1.00); opacity: 1; }
    }
    .cube-0 { animation: cube0 1.40s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; transform-origin: center; }
    .cube-1 { animation: cube1 1.40s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; transform-origin: center; }
    .cube-2 { animation: cube2 1.40s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; transform-origin: center; }
    .cube-3 { animation: cube3 1.40s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; transform-origin: center; }
    .cube-4 { animation: cube4 1.40s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; transform-origin: center; }
    .cube-5 { animation: cube5 1.40s cubic-bezier(0.65, 0, 0.35, 1) infinite alternate; transform-origin: center; }
  </style>
  <g class="cube-0">
    <path d="M103.923 300 L207.846 360 L207.846 480 L103.923 420 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M311.769 300 L207.846 360 L207.846 480 L311.769 420 Z" fill="#01A1FF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M207.846 240 L311.769 300 L207.846 360 L103.923 300 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
  </g>
  <g class="cube-1">
    <path d="M0 360 L103.923 420 L103.923 540 L0 480 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M207.846 360 L103.923 420 L103.923 540 L207.846 480 Z" fill="#01A1FF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M103.923 300 L207.846 360 L103.923 420 L0 360 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
  </g>
  <g class="cube-2">
    <path d="M103.923 -60 L207.846 0 L207.846 120 L103.923 60 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M311.769 -60 L207.846 0 L207.846 120 L311.769 60 Z" fill="#01A1FF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M207.846 -120 L311.769 -60 L207.846 0 L103.923 -60 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
  </g>
  <g class="cube-3">
    <path d="M-103.923 300 L0 360 L0 480 L-103.923 420 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M103.923 300 L0 360 L0 480 L103.923 420 Z" fill="#01A1FF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M0 240 L103.923 300 L0 360 L-103.923 300 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
  </g>
  <g class="cube-4">
    <path d="M0 0 L103.923 60 L103.923 180 L0 120 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M207.846 0 L103.923 60 L103.923 180 L207.846 120 Z" fill="#01A1FF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M103.923 -60 L207.846 0 L103.923 60 L0 0 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
  </g>
  <g class="cube-5">
    <path d="M-103.923 180 L0 240 L0 360 L-103.923 300 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M103.923 180 L0 240 L0 360 L103.923 300 Z" fill="#01A1FF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
    <path d="M0 120 L103.923 180 L0 240 L-103.923 180 Z" fill="#FFFFFF" stroke="#01A1FF" stroke-width="10" stroke-linejoin="round"/>
  </g>
</svg>
                </div>
                <div class="textc">
                    <h1>Not Found</h1>
                    <p>${message}</p>
                    ${html}
                </div>
            </div>
        </article>
    </section>
</body>

</html>
`;
