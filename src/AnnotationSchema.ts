
export interface AnnotationMerger<M> {
    ( a : M, b : M ) : M;
}

export interface AnnotationIdentity<M> {
    ( a : M, b : M ) : boolean;
}

export class AnnotationSchema<M> {
	name : string | symbol;
	// If true, a class/member cannot have more than one annotation of this type.
	// When more than one is added, it by default overwrites the previous one
	singleton : boolean;
	// The overwriting behaviour can be changed by setting this property to true
	// When true, causes a standard JS object merge on the metadata
	// When a custom function is passed, that function is called on merge
    merger : boolean | AnnotationMerger<M>;
    
    // An optional function that is used to match annotations
    identity : AnnotationIdentity<M>;

    // singleton & merge
    //  - false & any       => append
    //  - true & false      => overwrite
    //  - true & true       => standard merge
    //  - true & function   => custom merge

    constructor ( name : string | symbol, singleton : boolean = false, merger : boolean | AnnotationMerger<M> = true, identity : AnnotationIdentity<M> = null ) {
        this.name = name;
        this.singleton = singleton;
        this.merger = merger;
        this.identity = identity;
    }

    /**
     * Takes two annotations, when the annotation is marked as a singleton, and merges the two, returning a new one
     * 
     * @param a The older annotation metadata that was already there
     * @param b The newer metadata that is being merged
     */
    merge ( a : M, b : M ) : M {
        if ( typeof this.merger === 'function' ) {
            return this.merger( a, b );
        } else if ( this.merger === true ) {
            return { ...a, ...b };
        } else {
            return b;
        }
    }

    equals ( a : M, b : M ) : boolean {
        if ( this.identity != null ) {
            return this.identity( a, b );
        } else {
            return true;
        }
    }
}