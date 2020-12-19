


// async function update() {
//     const users = await dump(), points = [];
//     let katz = null;
//     for (let user of users) {
//         const result = calc(user);
//         if (result) {
//             if (user.is_katz) {
//                 katz = { x: result[0], y: result[1] }
//             } else {
//                 points.push(result);
//             }
//         }
//     }

//     const clusters = clusterPlot(points), output = { clusters };
//     if (katz) {
//         output.katz = katz;
//     }

//     fs.writeFile(base_dir + 'clusters.json', JSON.stringify(output), () => { });
// }

// module.exports = { update, calc };