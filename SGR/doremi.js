/* Upper melody and TAB transcribed from the user's 도레미송 PDF (악보 by 안쌤). */
(function () {
    'use strict';
    const pitches = {
        C3: [48,'도 (C)',5,3,-2], D3: [50,'레 (D)',4,0,-1], E3: [52,'미 (E)',4,2,0],
        F3: [53,'파 (F)',4,3,1], G3: [55,'솔 (G)',3,0,2], A3: [57,'라 (A)',3,2,3],
        'A#3': [58,'라♯ (A♯)',3,3,3], B3: [59,'시 (B)',2,0,4],
        C4: [60,'도 (높은 C)',2,1,5], D4: [62,'레 (높은 D)',2,3,6]
    };
    const measures = [
        [['C3',1.5],['D3',.5],['E3',1.5],['C3',.5]],
        [['E3',1],['C3',1],['E3',2]],
        [['D3',1.5],['E3',.5],['F3',.5],['F3',.5],['E3',.5],['D3',.5]],
        [['F3',4]],
        [['E3',1.5],['F3',.5],['G3',1.5],['E3',.5]],
        [['G3',1],['E3',1],['G3',2]],
        [['F3',1.5],['G3',.5],['A3',.5],['A3',.5],['G3',.5],['F3',.5]],
        [['A3',4]],
        [['G3',1.5],['C3',.5],['D3',.5],['E3',.5],['F3',.5],['G3',.5]],
        [['A3',4]],
        [['A3',1.5],['D3',.5],['E3',.5],['F3',.5],['G3',.5],['A3',.5]],
        [['B3',4]],
        [['B3',1.5],['E3',.5],['F3',.5],['G3',.5],['A3',.5],['B3',.5]],
        [['C4',3],['B3',.5],['A#3',.5]],
        [['A3',1],['F3',1],['B3',1],['G3',1]],
        [['C4',1],['G3',1],['E3',1],['D3',1]],
        [['C3',.5],['E3',.5],['E3',1],['E3',.5],['G3',.5],['G3',1]],
        [['D3',.5],['F3',.5],['F3',1],['A3',.5],['B3',.5],['B3',1]],
        [['C3',.5],['E3',.5],['E3',1],['E3',.5],['G3',.5],['G3',1]],
        [['D3',.5],['F3',.5],['F3',1],['A3',.5],['B3',.5],['B3',1]],
        [['G3',2],['C3',2]],
        [['A3',2],['F3',2]],
        [['E3',2],['C3',2]],
        [['D3',4]],
        [['G3',2],['C3',2]],
        [['A3',2],['B3',2]],
        [['C4',2],['D4',2]],
        [['C4',4]],
        [[null,.5],['C3',.5],['D3',.5],['E3',.5],['F3',.5],['G3',.5],['A3',.5],['B3',.5]],
        [['C4',1],['G3',1],['C4',1],[null,1]]
    ];
    const sections = Array.from({length: Math.ceil(measures.length / 4)}, (_, part) => {
        const first = part * 4 + 1, last = Math.min(first + 3, measures.length);
        let beat = 0, index = 0;
        const events = [];
        for (let measure = first; measure <= last; measure++) {
            let measureBeat = 0;
            measures[measure - 1].forEach(([pitch, beats], sourceIndex) => {
                const p = pitches[pitch];
                events.push(p ? {pitch,beats,beat,measure,measureBeat,index:index++,sourceId:`${measure}:${sourceIndex}`,
                    name:p[1],freq:440 * 2 ** ((p[0]-69)/12),string:p[2],fret:p[3],step:p[4],
                    accidental:pitch==='A#3'?'♯':''} : {rest:true,beats,beat,measure,measureBeat});
                beat += beats; measureBeat += beats;
            });
        }
        return {first,last,beats:beat,events,notes:events.filter(n=>!n.rest)};
    });
    window.DoremiSong = {id:'doremi',title:'도레미송',meter:4,tempo:120,key:'C',sections,
        attribution:'제공 악보 · 악보 by 안쌤'};
})();
