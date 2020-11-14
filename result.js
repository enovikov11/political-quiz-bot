const fs = require('fs');
const YAML = require('yaml');

const { questions } = YAML.parse(fs.readFileSync('./quiz.yaml', 'utf8'));

function calc({ answers, random_mapper }) {
    const result = {
        "more equality than markets": { value: 0, max: 0 },
        "more liberty than authority": { value: 0, max: 0 },
        "more progress than tradition": { value: 0, max: 0 },
        "more world than nation": { value: 0, max: 0 }
    };

    for (let i = 0; i < questions.length; i++) {
        const question = questions[random_mapper[i]];
        const answer = answers[i];

        result["more equality than markets"].value += answer * question["more equality than markets"];
        result["more equality than markets"].max += question["more equality than markets"];

        result["more liberty than authority"].value += answer * question["more liberty than authority"];
        result["more liberty than authority"].max += question["more liberty than authority"];

        result["more progress than tradition"].value += answer * question["more progress than tradition"];
        result["more progress than tradition"].max += question["more progress than tradition"];

        result["more world than nation"].value += answer * question["more world than nation"];
        result["more world than nation"].max += question["more world than nation"];
    }

    return result;
}