# startup script for docker
cd /src

if [ ! $SINO_CONFIG ]
then
    echo "Must provide config file via SINO_CONFIG"
    exit 1
fi

# Install custom deps
if [[ $SINO_NPM_INSTALL ]]
then
   npm install "${SINO_NPM_INSTALL}"
fi

# Build custom result parsers
find /etc/sinobot/parsers -type f -exec md5 {} \; > /tmp/sino_current_parsers
if [ -f .parsers_cache ]
then
    for i in $(find /etc/sinobot/parsers -type f)
    do
        filemd5="`md5 $i`"
        if [ ! grep -q "$filemd5" .parsers_cache ]
        then
            npm run build_parsers
            break
        fi
    done
    cp /tmp/sino_current_parsers ./parsers_cache
else
    cp /tmp/sino_current_parsers ./parsers_cache
    npm run build_parsers
fi

if [[ $SINO_VERBOSE ]]
then
    npm start -- --config "${SINO_CONFIG}" --verbose "${SINO_VERBOSE}"
else
    npm start -- --config "${SINO_CONFIG}"
fi