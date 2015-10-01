#! /usr/pbin/perl

use strict;

use Data::Dumper;

my $maxgen = $ARGV[0] || 100;

my $lb = $ARGV[1] || 2;

my @init; # = (0, 0, 0);

for (my $i = 0; $i < $lb; $i++) {
	push @init, 0;
}

my %words = ();
my @words = ();

my $lwc = 0;

sub addw {
	my ($w) = @_;
	$w = lc $w;
	if ($words{$w}) {
		return $words{$w};
	}
	push @words, $w;
	my $res = $w; #@words;
	$words{$w} = $res;
	return $res;
}

my $wlist = [];

while (<STDIN>) {
	chomp;
	my $line = $_;
	if (/^\s*$/) {
		addw("\n");
		next;
	}
	for my $w (split /[\s\[\]]+/, $line) {
		my $wi = addw($w);
		push @$wlist, $wi;
	}
}

my @pw = @init;

my $links = {};

for my $wi (@$wlist) {
	$links->{join ' ', @pw}{$wi}++;
	shift @pw;
	push @pw, $wi;
}

for my $pw (keys %$links) {
	my @ws = ();
	my $pwh = $links->{$pw};
	for my $wi (keys %$pwh) {
		my $c = $links->{$pw}{$wi};
		for (my $i = 0; $i < $c; $i++) {
			push @ws, $wi;
		}
	}
	$links->{$pw}{0} = \@ws;
}

@pw = @init;

my @out = ();

for (my $i = 0; $i < $maxgen; $i++) {
	my $ws = $links->{join ' ', @pw}{0};
	#print @pw, '->', @$ws, "\n";
	my $len = @$ws;
	my $k = int(rand($len));
	my $wi = $ws->[$k];
	push @out, $wi;
	shift @pw;
	push @pw, $wi;
}

#print Dumper($words);

#print Dumper($wlist);

#print Dumper(\@out);

#print Dumper(\@words);

for my $wi (@out) {
	#print $words[$wi], ' ';
	print $wi, ' ';
}

print "\n";
