const queues = {}

function run(queue, task) {
    if (!queues[queue]) {
        queues[queue] = Promise.resolve();
    }
    queues[queue] = queues[queue].then(task).catch(() => { });
}

module.exports = { run };