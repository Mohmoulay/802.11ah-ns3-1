#!/usr/bin/perl
use strict;


if(scalar @ARGV == 0) {
	print "Usage: analyzebatch.pl nssfolder config=(idx|name),(idx|name),... stats=(idx|name),(idx|name),(idx|name),... \n";
	exit();
}

opendir my $dir, $ARGV[0] or die "Cannot open directory: $!";
my @files;
@files = readdir $dir;


my @configIdx;
my @configparts = split('=',$ARGV[1]);
@configIdx = split(',', $configparts[1]);

#print "Config idx: " . join(" ", @configIdx);
my @statsIdx;
my @statsparts = split('=', $ARGV[2]);
@statsIdx = split(',', $statsparts[1]);

#print "Stats idx: " . join(" ", @statsIdx);

for(my $i = 0; $i < scalar @statsIdx; $i++) {
	if($statsIdx[$i] eq "DropTCPTxBufferExceeded") {
		# special case, bit of a hack,
		$statsIdx[$i] = 9999; # everything above 1000 idx should be treated as special i guess
	}
}

my $count = 0;
for my $f (@files) {

        if($f =~ /^.*?\.nss$/) {

		my $printHeaders = $count == 0;
		analyzeFile($f, $printHeaders);
                $count++;
        }
}



     my @statHeaders;
     my @configHeaders;



sub analyzeFile {
   my $f = $ARGV[0] . "/" . @_[0];
   my $printHeaders = @_[1];

  # print "Checking file $f \n";
    open my $info, $f or die "Could not open $f: $!";
   
     my @configParts;
     my @statParts;
     my $nrOfSta = 0;

     while(my $line = <$info>) {

		chomp $line;
		my @parts = split(";",$line);

		
		if($parts[1] eq "start") {
			# config line
			for my $idx (@configIdx) {
			  	push @configParts, $parts[$idx];
			}
		}
		elsif($parts[1] eq "startheader") {
			@configHeaders = (@parts);
			$configHeaders[0] = "time";
			$configHeaders[1] = "type";

			resolveConfigIdxNames();
		}
		elsif($parts[1] eq "nodestatsheader") {
			@statHeaders = (@parts);
			$statHeaders[0] = "time";
			$statHeaders[1] = "type";

			resolveIdxNames();
		}
		elsif($parts[1] eq "nodestats") {
			if($parts[2] == 0) {
				# start of new nodestats batch
				@statParts = ();
				for my $idx (@statsIdx) {
					push @statParts, 0;
				}
				$nrOfSta=0;
			}
			
			my $i = 0;
			for my $idx (@statsIdx) {
				my $val;
        	                if($idx > 1000) {
	                                # special case , handle manually here
	                                if($idx == 9999) { # tcpTxDrop
#						print $parts[25] . "\n" . $parts[26] . "\n";
                        	                $val = 0;
                	                        my @subParts = split(",",$parts[25]);
        	                                $val += $subParts[13];
	
	                                        @subParts = split(",", $parts[26]);
                                	        $val += $subParts[13];
                        	        }
                	        }
        	                else {
	                                $val = $parts[$idx];
	                        }

				$statParts[$i] = $statParts[$i] + $val;
				$i+=1;
			}
			$nrOfSta+=1;
		}
     }
     close $info;

     for(my $i = 0; $i < scalar @statParts; $i++) {
  	$statParts[$i] /= $nrOfSta;
     }

     if($printHeaders) {
         my @headers;
         for my $idx (@configIdx) {
            push @headers, $configHeaders[$idx];
         }
         for my $idx (@statsIdx) {

		if($idx == 9999) {
		    push @headers, "DropTCPTxBufferExceeded";
		}
		else {
		    push @headers, $statHeaders[$idx];
		}
         }
         print join(";", @headers);
         print "\n";
     }

     print join(";", @configParts);
     print ";";
     print join(";", @statParts);
     print "\n";
}

sub resolveConfigIdxNames {
                        for(my $itm; $itm < scalar @configIdx; $itm++) {
                                my $item = $configIdx[$itm];
                                if($item =~ /[0-9]+/) {
                                        # ok already index
                                }
                                else {
                                        # try to find the matching index based on name
                                        for(my $i = 0; $i < scalar @configHeaders; $i++) {
                                                #print lc($statHeaders[$i]) . " <-> " . $item . "\n";
                                                if(lc($configHeaders[$i]) eq lc($item)) {
                                                        $configIdx[$itm] = $i; # update to index
#                                                        print "updated $statsIdx[$item] to $i because its equal to $item\n";
                                                        last;
                                                }
                                        }
                                }
                        }


}

sub resolveIdxNames {
                        for(my $itm; $itm < scalar @statsIdx; $itm++) {
                                my $item = $statsIdx[$itm];
                                if($item =~ /[0-9]+/) {
                                        # ok already index
                                }
                                else {
                                        # try to find the matching index based on name
                                        for(my $i = 0; $i < scalar @statHeaders; $i++) {
						#print lc($statHeaders[$i]) . " <-> " . $item . "\n";
                                                if(lc($statHeaders[$i]) eq lc($item)) {
                                                        $statsIdx[$itm] = $i; # update to index
#							print "updated $statsIdx[$item] to $i because its equal to $item\n";
                                                        last;
                                                }
                                        }
                                }
                        }
}
