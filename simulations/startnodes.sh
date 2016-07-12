cd ../forwardsocketdata/

for i in {0..10}; do
	nodejs index.js $((7000+$i)) $((8000+$i)) 2001:6a8:1d80:2031:78a8:ad24:7e09:4647 1> /dev/null &
done
