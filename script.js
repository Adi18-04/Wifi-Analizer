const startButton =
    document.getElementById("startTest");

const statusText =
    document.getElementById("statusText");

const statusDot =
    document.getElementById("statusDot");

const downloadSpeed =
    document.getElementById("downloadSpeed");

const uploadSpeed =
    document.getElementById("uploadSpeed");

const downloadBar =
    document.getElementById("downloadBar");

const uploadBar =
    document.getElementById("uploadBar");

const connectionStatus =
    document.getElementById(
        "connectionStatus"
    );

const connectionDot =
    document.getElementById(
        "connectionDot"
    );

const connectionText =
    document.getElementById(
        "connectionText"
    );


/* ================================
   TEST SETTINGS
================================ */

const TEST_DURATION =
    10_000;

const DOWNLOAD_URL =
    "https://speed.cloudflare.com/__down?bytes=25000000&cache=";

const UPLOAD_URL =
    "https://speed.cloudflare.com/__up";


/* ================================
   ONLINE / OFFLINE STATUS
================================ */

function updateConnectionStatus() {

    if (navigator.onLine) {

        connectionStatus.classList.remove(
            "offline"
        );

        connectionStatus.classList.add(
            "online"
        );

        connectionText.textContent =
            "ONLINE";

    } else {

        connectionStatus.classList.remove(
            "online"
        );

        connectionStatus.classList.add(
            "offline"
        );

        connectionText.textContent =
            "OFFLINE";
    }
}


/* Check immediately */

updateConnectionStatus();


/* Listen for changes */

window.addEventListener(
    "online",
    updateConnectionStatus
);

window.addEventListener(
    "offline",
    updateConnectionStatus
);


/* ================================
   DOWNLOAD TEST
================================ */

async function measureDownload() {

    const controller =
        new AbortController();

    const start =
        performance.now();

    const endTime =
        start + TEST_DURATION;

    let received = 0;


    const timer =
        setTimeout(
            () => controller.abort(),
            TEST_DURATION
        );


    try {

        while (
            performance.now() < endTime
        ) {

            const url =
                DOWNLOAD_URL +
                Math.random();


            const response =
                await fetch(
                    url,
                    {
                        cache: "no-store",

                        signal:
                            controller.signal
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Download request failed."
                );
            }


            if (!response.body) {

                throw new Error(
                    "Browser streaming is not supported."
                );
            }


            const reader =
                response.body.getReader();


            while (true) {

                const {
                    done,
                    value
                } =
                    await reader.read();


                if (done) {
                    break;
                }


                received +=
                    value.length;


                const elapsed =
                    (
                        performance.now() -
                        start
                    ) / 1000;


                if (elapsed > 0) {

                    const mbps =
                        (
                            received * 8
                        ) /
                        elapsed /
                        1_000_000;


                    downloadSpeed.textContent =
                        mbps.toFixed(1);


                    downloadBar.style.width =
                        Math.min(
                            mbps,
                            100
                        ) + "%";
                }


                if (
                    performance.now() >=
                    endTime
                ) {

                    controller.abort();

                    break;
                }
            }
        }

    } catch (error) {

        if (
            error.name !==
            "AbortError"
        ) {

            throw error;
        }

    } finally {

        clearTimeout(timer);
    }


    const elapsed =
        (
            performance.now() -
            start
        ) / 1000;


    return (
        received * 8
    ) /
    elapsed /
    1_000_000;
}


/* ================================
   UPLOAD TEST
================================ */

async function measureUpload() {

    const controller =
        new AbortController();

    const start =
        performance.now();

    const endTime =
        start + TEST_DURATION;

    let uploaded = 0;


    /*
       1 MB upload chunk.
    */

    const chunkSize =
        1_000_000;


    const data =
        new Uint8Array(
            chunkSize
        );


    /*
       Generate random data.
    */

    const randomChunk =
        65_536;


    for (
        let offset = 0;
        offset < chunkSize;
        offset += randomChunk
    ) {

        const end =
            Math.min(
                offset +
                randomChunk,
                chunkSize
            );


        crypto.getRandomValues(
            data.subarray(
                offset,
                end
            )
        );
    }


    const timer =
        setTimeout(
            () => controller.abort(),
            TEST_DURATION
        );


    async function uploadWorker() {

        while (
            performance.now() < endTime
        ) {

            try {

                await fetch(
                    UPLOAD_URL,
                    {
                        method: "POST",

                        body: data,

                        cache: "no-store",

                        signal:
                            controller.signal
                    }
                );


                uploaded +=
                    chunkSize;


                const elapsed =
                    (
                        performance.now() -
                        start
                    ) / 1000;


                if (elapsed > 0) {

                    const mbps =
                        (
                            uploaded * 8
                        ) /
                        elapsed /
                        1_000_000;


                    uploadSpeed.textContent =
                        mbps.toFixed(1);


                    uploadBar.style.width =
                        Math.min(
                            mbps,
                            100
                        ) + "%";
                }


            } catch (error) {

                if (
                    error.name ===
                    "AbortError"
                ) {

                    break;
                }


                console.warn(
                    "Upload request failed:",
                    error
                );
            }
        }
    }


    /*
       Four simultaneous streams.
    */

    await Promise.all([
        uploadWorker(),
        uploadWorker(),
        uploadWorker(),
        uploadWorker()
    ]);


    clearTimeout(timer);


    const elapsed =
        (
            performance.now() -
            start
        ) / 1000;


    return (
        uploaded * 8
    ) /
    elapsed /
    1_000_000;
}


/* ================================
   START TEST
================================ */

async function startSpeedTest() {

    startButton.disabled =
        true;


    startButton.textContent =
        "TESTING...";


    statusDot.style.background =
        "#f5b942";


    downloadSpeed.textContent =
        "--";

    uploadSpeed.textContent =
        "--";


    downloadBar.style.width =
        "0%";

    uploadBar.style.width =
        "0%";


    try {

        /* =========================
           UPLOAD
        ========================= */

        statusText.textContent =
            "Testing upload • 10 seconds";


        const upload =
            await measureUpload();


        uploadSpeed.textContent =
            upload.toFixed(1);


        uploadBar.style.width =
            Math.min(
                upload,
                100
            ) + "%";


        /* =========================
           DOWNLOAD
        ========================= */

        statusText.textContent =
            "Testing download • 10 seconds";


        const download =
            await measureDownload();


        downloadSpeed.textContent =
            download.toFixed(1);


        downloadBar.style.width =
            Math.min(
                download,
                100
            ) + "%";


        /* =========================
           COMPLETE
        ========================= */

        statusText.textContent =
            "Test completed";


        statusDot.style.background =
            "#32d583";


        startButton.textContent =
            "TEST AGAIN";


    } catch (error) {

        console.error(
            "Speed test error:",
            error
        );


        statusText.textContent =
            "Test failed";


        statusDot.style.background =
            "#ef4444";


        startButton.textContent =
            "TRY AGAIN";
    }


    startButton.disabled =
        false;
}


/* ================================
   BUTTON
================================ */

startButton.addEventListener(
    "click",
    startSpeedTest
);