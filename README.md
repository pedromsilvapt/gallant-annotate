# @gallant/annotate

> Tools for working with annotations in JavaScript/TypeScript classes

# Installation
```shell
npm install --save @gallant/annotate
```

# Usage
```typescript
import { Annotate } from '@gallant/annotate';

export const HookSchema = Annotate.schema<HookOptions>( Symbol( 'Hook' ), true, false );

export interface HookOptions {
    name: string;
}

export function Hook ( hook ?: HookOptions | string ) {
    return ( target : any, property : string | symbol ) => {
        if ( !hook ) {
            hook = property.toString();

            // If the property name starts with 'on' and the next letter is uppercase
            if ( hook.startsWith( 'on' ) && hook[ 2 ] === hook[ 2 ].toUpperCase() ) {
                hook = hook[ 2 ].toLowerCase() + hook.slice( 3 );
            }
        }
    
        if ( typeof hook === 'string' ) {
            hook = { name: hook };
        }

        Annotate.add( target, property, HookSchema, hook );
    };
}

class Component {
    @Hook()
    onInit () { }
}

console.log( Annotate.get( Component.prototype, HookSchema ) );
```
