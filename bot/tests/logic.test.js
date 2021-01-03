jest.mock('../src/settings', () => {
    const settings = jest.requireActual('../src/settings');
    return { ...settings, adminChatId: 1 };
});


const { getUserPoint, getDivision, getResults } = require('../src/logic'),
    { makeAnswers, makeDivision, makeResults } = require('./logic.data');

function getPointStr(point) {
    return point === null ? null : `${Math.round(point[0] * 100)}-${Math.round(point[1] * 100)}`;
}

describe('logic', () => {
    test('getUserPoint', () => {
        const answers = makeAnswers();
        expect([answers['1'], answers['2'], answers['3']].map(getUserPoint).map(getPointStr)).toEqual(["49-50", null, "46-52"]);
    });

    test('getDivision', () => {
        const answers = makeAnswers(), division = makeDivision();
        expect(new Array(54).fill().map((_, i) => getDivision({ answers }, i))).toEqual(division);
    });

    test('getResults', () => {
        const answers = makeAnswers(), { full, semiFinished, first, middle } = makeResults();

        expect(getResults({ maxAvailableQuestionId: 54, nextAvailableUpdateAt: null, answers })).toEqual(full);
        expect(getResults({ maxAvailableQuestionId: 54, nextAvailableUpdateAt: 123, answers })).toEqual(semiFinished);
        expect(getResults({ maxAvailableQuestionId: 0, nextAvailableUpdateAt: null, answers })).toEqual(first);
        expect(getResults({ maxAvailableQuestionId: 13, nextAvailableUpdateAt: null, answers })).toEqual(middle);
    });

});
