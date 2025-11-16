async function sliceAudio(file, sliceSeconds) {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new AudioContext();
    const audio = await audioCtx.decodeAudioData(arrayBuffer);

    const slices = [];
    const totalSlices = Math.floor(audio.duration / sliceSeconds);

    for (let i = 0; i < totalSlices; i++) {
        const start = i * sliceSeconds;
        const end = Math.min((i + 1) * sliceSeconds, audio.duration);

        const frameStart = Math.floor(start * audio.sampleRate);
        const frameEnd = Math.floor(end * audio.sampleRate);
        const frameCount = frameEnd - frameStart;

        const buffer = audioCtx.createBuffer(
            audio.numberOfChannels,
            frameCount,
            audio.sampleRate
        );

        for (let ch = 0; ch < audio.numberOfChannels; ch++) {
            buffer.getChannelData(ch).set(
                audio.getChannelData(ch).slice(frameStart, frameEnd)
            );
        }

        const wavBlob = bufferToWav(buffer);
        slices.push({ index: i, blob: wavBlob });
    }

    return slices;
}

// Convert AudioBuffer → WAV Blob
function bufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const samples = buffer.length;
    const blockAlign = numChannels * bitDepth / 8;
    const byteRate = sampleRate * blockAlign;

    const wavBuffer = new ArrayBuffer(44 + samples * blockAlign);
    const view = new DataView(wavBuffer);

    let offset = 0;

    function writeString(s) {
        for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i));
    }

    writeString("RIFF");
    view.setUint32(offset, 36 + samples * blockAlign, true); offset += 4;
    writeString("WAVE");
    writeString("fmt ");
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, format, true); offset += 2;
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bitDepth, true); offset += 2;

    writeString("data");
    view.setUint32(offset, samples * blockAlign, true); offset += 4;

    let sampleIndex = 0;
    for (let i = 0; i < samples; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            let s = buffer.getChannelData(ch)[i];
            s = Math.max(-1, Math.min(1, s));
            view.setInt16(offset, s * 32767, true);
            offset += 2;
        }
    }

    return new Blob([wavBuffer], { type: "audio/wav" });
}

async function createDWPFromSlices(slices, rootNote) {
    const zip = new JSZip();
    const programZones = [];

    // Add all WAV slices
    slices.forEach((slice, i) => {
        const filename = `sample_${i}.wav`;
        zip.file(filename, slice.blob);

        programZones.push(`
        <Zone>
            <RootNote>${rootNote + i}</RootNote>
            <HiNote>${rootNote + i}</HiNote>
            <LoNote>${rootNote + i}</LoNote>
            <SampleName>${filename}</SampleName>
        </Zone>`);
    });

    const dwpXML = `<?xml version="1.0"?>
<DirectWavePresets>
  <Program>
    <Name>Chromatic Program</Name>
    ${programZones.join("\n")}
  </Program>
</DirectWavePresets>`;

    zip.file("program.dwp", dwpXML);

    return zip.generateAsync({ type: "blob" });
}

// UI
const wavInput = document.getElementById("wavInput");
const sliceLengthInput = document.getElementById("sliceLength");
const rootNoteInput = document.getElementById("rootNote");
const status = document.getElementById("status");
const convertBtn = document.getElementById("convertBtn");

convertBtn.onclick = async () => {
    const wavFile = wavInput.files[0];
    if (!wavFile) {
        status.innerText = "No WAV loaded.";
        return;
    }

    status.innerText = "Slicing chromatic…";

    const slices = await sliceAudio(wavFile, Number(sliceLengthInput.value));

    status.innerText = `Generated ${slices.length} slices. Packing DWP…`;

    const dwpZip = await createDWPFromSlices(slices, Number(rootNoteInput.value));

    const a = document.createElement("a");
    a.href = URL.createObjectURL(dwpZip);
    a.download = "Chromatic_DWP.zip";
    a.click();

    status.innerText = "Done! Import in DirectWave.";
};
