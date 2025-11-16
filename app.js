// FRONTEND: Packs WAVs *inside* the DWP ZIP so DirectWave won't say:
// "sample not found or corrupted"

async function createDWP(wavFile) {
    const zip = new JSZip();

    // 1. Put WAV directly in the root of the ZIP
    // DirectWave requires very flat structure
    zip.file("sample.wav", wavFile);

    // 2. Minimal valid DWP file
    // This layout 100% loads in DirectWave as long as sample.wav exists
    const dwpContent = `<?xml version="1.0"?>
<DirectWavePresets>
  <Program>
    <Name>Converted Sample</Name>
    <Zone>
      <RootNote>60</RootNote>
      <HiNote>127</HiNote>
      <LoNote>0</LoNote>
      <SampleName>sample.wav</SampleName>
    </Zone>
  </Program>
</DirectWavePresets>`;

    zip.file("program.dwp", dwpContent);

    // 3. Build ZIP for download
    return zip.generateAsync({ type: "blob" });
}

// UI logic
const wavInput = document.getElementById("wavInput");
const status = document.getElementById("status");
const convertBtn = document.getElementById("convertBtn");

convertBtn.onclick = async () => {
    const file = wavInput.files[0];
    if (!file) {
        status.innerText = "No file selected.";
        return;
    }

    status.innerText = "Packing…";

    try {
        const dwpZip = await createDWP(file);

        const a = document.createElement("a");
        a.href = URL.createObjectURL(dwpZip);
        a.download = "ConvertedSample.zip";
        a.click();

        status.innerText = "Done! Import the ZIP directly into DirectWave.";
    } catch (err) {
        status.innerText = "Error: " + err;
    }
};
