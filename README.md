# SEALang
SEALang is a super set of Perl5 with static typing. The transpiler is powered by Node.JS

# Example of SEALang

```
import (Method_A, Method_B) from lib.pkg; 

sub echo(Scalar k,Scalar v) {
    print("key => $k, value => $v");
}

Array arr = (5,10,15);
arr.push(25);
arr.reverse;
arr.forEach( echo );

String hello = 'hello world'; 
println(hello);
println(typeof(hello) eq String);

Boolean test = true;
if test {
    # true
}

Map _t; 
_t.set('a',5);
_t.set('b',10);
_t.forEach( (Scalar k,Scalar v) => print("key => $k, value => $v") );
```

And the compiled Perl5 version : 

```perl
use strict;
use warnings;
use lib::pkg qw(Method_A Method_B);

my $echo = sub {
    my ($k,$v) = @_;
    print("key => $k, value => $v");
}

my $arr = Array->new((5,10,15));
$arr->push(25);
$arr->reverse;
$arr->forEach( $echo );

my $hello = String->new('hello world');
print $hello->valueOf."\n";
{
    my $retRef = ref($hello) eq "String";
    print "$retRef\n";
}

my $test = Boolean->new(1);
if($test->true) {
    # true !
}

my $_t = Hashmap->new;
$_t->set('a',5);
$_t->set('b',10);
$_t->forEach(sub {
    my ($k,v) = @_;
    print("key => $k, value => $v");
});
```