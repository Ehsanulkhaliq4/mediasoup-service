import mediasoup from "mediasoup";

let worker;

export async function createWorker() {
    worker = await mediasoup.createWorker({
        logLevel: "warn",
        logTags: [
            "info",
            "ice",
            "dtls",
            "rtp",
            "srtp",
            "rtcp"
        ]
    });


    console.log(`mediasoup Worker created. PID: ${worker.pid}`);

    worker.on("died" , () =>{
        console.error("mediasoup Worker died");

        setTimeout(() => {
            process.exit(1);
        }, 2000);
    });
    return worker;
}