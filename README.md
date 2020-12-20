# 8values
Based on https://github.com/8values/8values.github.io https://github.com/8values-ru/8values-ru.github.io

`apt install docker.io`  

`docker build -t political-quiz-bot .`  
`docker run -dit --rm -p 443:443 -v /root/political-quiz-bot/secret:/app/secret:ro -v /root/political-quiz-bot/data:/app/data --name political-quiz-bot political-quiz-bot`  

`docker run -dit --rm -p 443:443 -v /Users/enovikov11/Desktop/political-quiz-bot/secret:/app/secret:ro -v /Users/enovikov11/Desktop/political-quiz-bot/data:/app/data --name political-quiz-bot political-quiz-bot`  
