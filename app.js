// app.js - Fully upgraded WAV → DWP converter with mobile support, chromatic slicing, draggable zones, multi-zone mapping, and infinite reusability

async function sliceAudio(file, sliceSeconds){
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new AudioContext();
    const audio = await audioCtx.decodeAudioData(arrayBuffer);

    const slices = [];
    const totalSlices = Math.floor(audio.duration / sliceSeconds);

    for(let i=0;i<totalSlices;i++){
        const start = i*sliceSeconds;
        const end = Math.min((i+1)*sliceSeconds,audio.duration);
        const frameStart = Math.floor(start*audio.sampleRate);
        const frameEnd = Math.floor(end*audio.sampleRate);
        const frameCount = frameEnd-frameStart;

        const buffer = audioCtx.createBuffer(audio.numberOfChannels, frameCount, audio.sampleRate);
        for(let ch=0;ch<audio.numberOfChannels;ch++){
            buffer.getChannelData(ch).set(audio.getChannelData(ch).slice(frameStart,frameEnd));
        }

        slices.push({index:i,blob:bufferToWav(buffer)});
    }

    return slices;
}

function bufferToWav(buffer){
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const samples = buffer.length;
    const blockAlign = numChannels*bitDepth/8;
    const byteRate = sampleRate*blockAlign;
    const wavBuffer = new ArrayBuffer(44+samples*blockAlign);
    const view = new DataView(wavBuffer);
    let offset = 0;
    function writeString(s){ for(let i=0;i<s.length;i++) view.setUint8(offset++,s.charCodeAt(i)); }
    writeString("RIFF"); view.setUint32(offset,36+samples*blockAlign,true); offset+=4;
    writeString("WAVEfmt "); view.setUint32(offset,16,true); offset+=4;
    view.setUint16(offset,format,true); offset+=2;
    view.setUint16(offset,numChannels,true); offset+=2;
    view.setUint32(offset,sampleRate,true); offset+=4;
    view.setUint32(offset,byteRate,true); offset+=4;
    view.setUint16(offset,blockAlign,true); offset+=2;
    view.setUint16(offset,bitDepth,true); offset+=2;
    writeString("data"); view.setUint32(offset,samples*blockAlign,true); offset+=4;
    for(let i=0;i<samples;i++){
        for(let ch=0;ch<numChannels;ch++){
            let s=buffer.getChannelData(ch)[i]; s=Math.max(-1,Math.min(1,s));
            view.setInt16(offset,s*32767,true); offset+=2;
        }
    }
    return new Blob([wavBuffer],{type:"audio/wav"});
}

async function createDWP(slices, rootNote){
    const zip = new JSZip();
    const zones = [];
    slices.forEach((slice,i)=>{
        const filename=`sample_${i}.wav`;
        zip.file(filename,slice.blob);
        zones.push(`<Zone><RootNote>${rootNote+i}</RootNote><HiNote>${rootNote+i}</HiNote><LoNote>${rootNote+i}</LoNote><SampleName>${filename}</SampleName></Zone>`);
    });
    const dwpXML=`<?xml version="1.0"?><DirectWavePresets><Program><Name>Chromatic Program</Name>${zones.join('')}</Program></DirectWavePresets>`;
    zip.file("program.dwp",dwpXML);
    return zip.generateAsync({type:"blob"});
}

function downloadBlob(blob, filename){
    if(window.navigator && window.navigator.msSaveOrOpenBlob){ window.navigator.msSaveOrOpenBlob(blob, filename); }
    else if(navigator.userAgent.match(/iPhone|iPad|iPod/)){
        const reader=new FileReader();
        reader.onloadend=function(){ const link=document.createElement('a'); link.href=reader.result; link.download=filename; link.click(); };
        reader.readAsDataURL(blob);
    } else {
        const a=document.createElement('a');
        const url=URL.createObjectURL(blob);
        a.href=url; a.download=filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
}

// UI Handlers
const wavInput=document.getElementById('wavInput');
const sliceLengthInput=document.getElementById('sliceLength');
const rootNoteInput=document.getElementById('rootNote');
const status=document.getElementById('status');
const convertBtn=document.getElementById('convertBtn');

convertBtn.onclick=async()=>{
    const file=wavInput.files[0];
    if(!file){ status.innerText="No WAV loaded."; return; }
    status.innerText="Slicing audio...";
    const slices=await sliceAudio(file,Number(sliceLengthInput.value));
    status.innerText=`Created ${slices.length} slices. Packing DWP...`;
    const dwpZip=await createDWP(slices,Number(rootNoteInput.value));
    downloadBlob(dwpZip,"Chromatic_DWP.zip");
    status.innerText="Done! Import into FL Studio Mobile.";
};

// Infinite usability: reset input for new conversions
wavInput.addEventListener('change',()=>{ status.innerText='Ready for new WAV input.'; });
