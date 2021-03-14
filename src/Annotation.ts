import { AnnotationSchema } from './AnnotationSchema';

export interface Class<T, I extends any[] = any[]> {
    new ( ...args : I ) : T;
}

export class Annotation<T = any, M = any> {
    owner : Class<T>;
    originalOwner : Class<any>;
	member ?: string | symbol;
	metadata : M;
    name : string | symbol;
    
    constructor ( name : string | symbol, owner : Class<T>, member : string | symbol, metadata : M, aoriginalOwner : Class<any> = null ) {
        this.name = name;
        this.owner = owner;
        this.member = member;
        this.metadata = metadata;
        this.originalOwner = this.originalOwner || owner;
    }
	
	is <M, T = any> ( name : string | symbol | AnnotationSchema<M> ) : this is Annotation<T, M> {
        if ( typeof name === 'string' || typeof name === 'symbol' ) {
            return this.name === name;
        }
        
        return this.name === name.name;
    }

    cloneWithOwner<U> ( owner: Class<U> ) : Annotation<U, M> {
        return new Annotation( this.name, owner, this.member, this.metadata, this.originalOwner );
    }

    cloneWithMetadata ( metadata : M ): Annotation<T, M> {
        return new Annotation( this.name,this.owner, this.member, metadata, this.originalOwner );
    }

    equals ( annotation : Annotation<T, M>, schema : AnnotationSchema<M> ) : boolean {
        return this.owner === annotation.owner 
            && this.member === annotation.member 
            && this.name === annotation.name
            && schema.equals( this.metadata, annotation.metadata );
    }
}