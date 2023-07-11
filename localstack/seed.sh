#!/bin/bash

# This file is used to clean up the line endings in the init scripts
# It is required to run the init scripts on Windows
# This file is already cleaned by using the following command:
# sed -i -e 's/\r$//' ./localstack/_init.sh on the root folder

sleep 5;

for FILE in `ls /localstack/`; do
    if [ "$FILE" == "seed.sh" ]; then
        continue
    fi

    sed -i -e 's/\r$//' "/localstack/$FILE"
    chmod +x "/localstack/$FILE"
    echo "Running init script: $FILE"
    sh /localstack/$FILE
done

echo "Finish running init scripts"
exit 0