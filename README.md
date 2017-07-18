# SEALang
SEALang is a language created to be transpiled into Perl5. SEALang bring a cool and fancy syntax that let you write perl functional code with the power of static typing (only at the linter level). SEALang use the perl stdlib that has been created to bring Perl Object primitive wrapper that let you get "trustable" code.

# Example of SEALang

```js
import (Method_A, Method_B) from lib.pkg

sub echo(Scalar k,Scalar v) 
    print("key => $k, value => $v")
end

Array<Scalar> myArr (5,10,15)
// Or tell to the linter the type of the values in the array
// Array<Integer> myArr (5,10,15)
arr.push[25][30].reverse.forEach(echo)

String hello = 'hello world'
println[hello][typeof(hello) eq String]

Boolean test = true
if test 
    // true
end

Map<Integer> _t ( c => 10 )
_t->a = 5
_t->b = 10
println(_t->a)
_t.forEach( (Scalar k,Integer v) => print("key => $k, value => $v\n") )

Hash test {
    customVar => 'hash type!!!'
}
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
$arr->push(30);
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

my $_t = Hashmap->new({c=>10});
$_t->set('a',stdlib::integer->new(5));
$_t->set('b',stdlib::integer->new(10));
print "$_t->get('a')\n";
$_t->forEach(sub {
    my ($k,v) = @_;
    print("key => $k, value => $v->valueOf()\n");
});

my $hash = {
    customVar => "hash type!!!"
}
```

---

First Blessed object draft : 

```js
package test;
export (customMethod)

static String myVar = "hello world"

sub customMethod(Scalar A) 
    println(A)
end

class User 

    new(String name,Integer self.age) 
        println(test.myVar)
        self.name = name
    end

    sayHello() 
        println("hello ${self.name} with age ${self.age}");
    end

end
```