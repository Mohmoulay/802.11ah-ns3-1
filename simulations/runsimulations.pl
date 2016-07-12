#!/usr/bin/perl

use strict;

opendir my $dir, "." or die "Cannot open directory: $!";
my @files = readdir $dir;
closedir $dir;

my %arguments;

readArgs("common.conf", \%arguments);

for my $f (@files) {

	if($f =~ /^.*?\.conf$/ && $f ne "common.conf") {
		print "Starting $f\n";
		my %args = (%arguments);
		readArgs($f, \%args);
		
		run($f, \%args);
	}
}


sub readArgs {
	my $file = @_[0];
	my $args = @_[1];

	open my $info, $file or die "Could not open $file: $!";
	while(my $line = <$info>) {
		if($line =~ /(.*?)=(.*)/) {
			#print "$1 -> $2\n";
			$args->{$1} = $2;
		}
	}
	close $info;
}

sub run {
	my $file = @_[0];
	my $args = @_[1];
	
	#print join("\n", map { $_ . ": " . $args->{$_} } keys %{ $args });

	my $argsString = join(" ", map { $_ . "=" . $args->{$_} } keys %{ $args });
	$argsString =~ s/\"/\\\"/g;

	my $logFile = $file . ".log";
	my $exec = '(cd ../ns-3/ && ./waf --run "scratch/ahsimulation/ahsimulation ' . $argsString . '") 1> ' . $logFile . ' 2>&1 &';

	print "$exec\n";

	system($exec);
	# allow some time to finish the ./waf build json building
	sleep 10 
}
