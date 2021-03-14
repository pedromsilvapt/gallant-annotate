import { collect, groupingBy } from 'data-collectors';
import { Class, Annotation } from './Annotation';
import { AnnotationSchema, AnnotationMerger, AnnotationIdentity } from './AnnotationSchema';

type AddOverloads<M, T> = [ Annotation<T, M> ]
                        | [ Class<T>, Annotation<T, M> ]
                        | [ Class<T>, string | symbol | AnnotationSchema<M>, M ]
                        | [ Class<T>, string | symbol, string | symbol | AnnotationSchema<M>, M ];

export type AnnotationIdentifier<M> = string | symbol | AnnotationSchema<M>;

export class Annotate {
    /**
     * Contains all annotations grouped by class
     */
    protected static annotations : Map<Class<any>, Annotation<any, any>[]> = new Map();
    protected static schemas : Map<string | symbol, AnnotationSchema<any>> = new Map();

    protected static defaultSchema : AnnotationSchema<any> = new AnnotationSchema( null, true, false );

    protected static addSchema<M> ( schema : AnnotationSchema<M> ) : AnnotationSchema<M> {
        if ( !this.schemas.has( schema.name ) ) {
            this.schemas.set( schema.name, schema );
        }

        return schema;
    }

    protected static inheritAnnotations<T> ( target : Class<T> ) : Annotation<T>[] {
        const parent = Object.getPrototypeOf( target );

        if ( parent != null ) {
            // Clone the array of inherited annotations setting the owner to the original owner
            const inherited = this.getAll( parent ).map( annotation => annotation.cloneWithOwner( target ) );

            this.annotations.set( target, inherited );

            return inherited;
        }

        const annotations : Annotation<T>[] = [];

        this.annotations.set( target, annotations );
        
        return annotations;
    }

    protected static addAnnotation<M, T> ( annotation : Annotation<T, M> ) : Annotation<T, M> {
        let classAnnotations = this.getAll( annotation.owner );

        // When this class has now annotation yet, we can safely add it and store it right away
        // Knowing there would be no "duplicates" already stored
        if ( !classAnnotations ) {
            classAnnotations = [ annotation ];

            this.annotations.set( annotation.owner, classAnnotations );

            return annotation;
        }

        // Some annotations can have schemas defined (optionally) that describe certain behaviors of~
        // those specific annotations, such as if they are singletons (can only be defined for each class/method)
        // and in such cases, which merge strategy to employ
        const schema = this.schemas.get( annotation.name ) || this.defaultSchema;

        // Since some annotations can be singletons, we need to check if there is already another declared for it
        // And merge the two
        if ( schema.singleton ) {
            const existingIndex = classAnnotations.findIndex( ann => ann.equals( annotation, schema ) );

            if ( existingIndex >= 0 ) {
                const existingAnnotation = classAnnotations[ existingIndex ];

                // Pass the existing annotation first to the merge and only then the new annotation
                annotation = existingAnnotation.cloneWithMetadata( schema.merge( existingAnnotation.metadata, annotation.metadata ) );

                // Right now the new annotations takes the place of the old one
                // TODO Maybe allow a property on the schema to dictate order behavior (keep, append, prepend)
                classAnnotations[ existingIndex ] = annotation;
            } else {
                classAnnotations.push( annotation );
            }
        } else {
            classAnnotations.push( annotation );
        }

        return annotation;
    }

    static add<M, T> ( annotation : Annotation<T, M> ) : Annotation<T, M>;
    static add<M, T> ( target : Class<T>, annotation : Annotation<T, M> ) : Annotation<T, M>;
	static add<M, T> ( target : Class<T>, name : string | symbol | AnnotationSchema<M>, metadata : M ) : Annotation<T, M>;
    static add<M, T> ( target : Class<T>, member : string | symbol, name : string | symbol | AnnotationSchema<M>, metadata : M ) : Annotation<T, M>;
    static add<M, T> ( ...args : AddOverloads<M, T> ) : Annotation<T, M> {
        if ( args.length == 1 ) {
            const [ annotation ] = args;

            return this.addAnnotation( annotation );
        } else if ( args.length == 2 ) {
            const [ target, annotation ] = args;

            return this.addAnnotation( annotation.cloneWithOwner( target ) );
        } else if ( args.length == 3 ) {
            const [ target, name, metadata ] = args;

            if ( name instanceof AnnotationSchema ) {
                this.addSchema( name );

                return this.addAnnotation( new Annotation( name.name, target, null, metadata ) );
            } else {
                return this.addAnnotation( new Annotation( name, target, null, metadata ) );
            }
        } else if ( args.length == 4 ) {
            let [ target, member, name, metadata ] = args;

            if ( name instanceof AnnotationSchema ) {
                this.addSchema( name );

                return this.addAnnotation( new Annotation( name.name, target, member, metadata ) );
            } else {
                return this.addAnnotation( new Annotation( name, target, member, metadata ) );
            }
        }
    }

    static remove ( annotations : Annotation | Annotation[] ) : void {
        if ( annotations instanceof Array ) {
            if ( annotations.length == 0 ) {
                this.remove( annotations[ 0 ] );
            } else {
                const annotationsByOwner = collect( annotations, groupingBy( ann => ann.owner ) );

                for ( let [ owner, anns ] of annotationsByOwner ) {
                    const allAnnotations = this.annotations.get( owner );

                    if ( allAnnotations ) {
                        this.annotations.set( owner, allAnnotations.filter( ann => anns.indexOf( ann ) == -1 ) );
                    }
                }
            }
        } else {
            const allAnnotations = this.annotations.get( annotations.owner );

            const index = allAnnotations.indexOf( annotations );

            if ( index > -1 ) {
                allAnnotations.splice( index, 1 );
            }
        }
    }
    
    // Take care of inheritance by duplicating existing annotations
	static getAll<M = any, T = any> ( target : Class<T> ) : Annotation<T, M>[] {
        let annotations = this.annotations.get( target );

        if ( annotations == null ) {
            annotations = this.inheritAnnotations( target );
        }

        return annotations;
    }

    static getAllForClass<M = any, T = any> ( target : Class<T> ) : Annotation<T, M>[] {
        return this.getAllForMember( target, null );
    }

	static getAllForMember<M = any, T = any> ( target : Class<T>, member : string | symbol ) : Annotation<T, M>[] {
        return this.getAll( target ).filter( annotation => annotation.member == member );
    }

	static get<M, T> ( target : Class<T>, filters : AnnotationIdentifier<M>[] | AnnotationIdentifier<M> ) : Annotation<T, M>[];
	static get<M, T> ( target : any, filters : AnnotationIdentifier<M>[] | AnnotationIdentifier<M> ) : Annotation<T, M>[];
	static get<M, T> ( target : any, filters : AnnotationIdentifier<M>[] | AnnotationIdentifier<M> ) : Annotation<T, M>[] {
        if ( !( filters instanceof Array ) ) {
            return this.getAll( target ).filter( ann => ann.is( filters ) );
        } else {
            return this.getAll( target ).filter( ann => filters.some( filter => ann.is( filter ) ) );
        }
    }
    
    static getForClass<M = any, T = any> ( target : Class<T>, filters : AnnotationIdentifier<M>[] | AnnotationIdentifier<M> ) : Annotation<T, M>[];
    static getForClass<M = any, T = any> ( target : any, filters : AnnotationIdentifier<M>[] | AnnotationIdentifier<M> ) : Annotation<T, M>[];
    static getForClass<M = any, T = any> ( target : any, filters : AnnotationIdentifier<M>[] | AnnotationIdentifier<M> ) : Annotation<T, M>[] {
        return this.getForMember( target, null, filters );
    }

	static getForMember<M, T> ( target : Class<T>, member : string | symbol, filters : AnnotationIdentifier<M>[] | AnnotationIdentifier<M> ) : Annotation<T, M>[];
	static getForMember<M, T> ( target : any, member : string | symbol, filters : AnnotationIdentifier<M>[] | AnnotationIdentifier<M> ) : Annotation<T, M>[];
	static getForMember<M, T> ( target : any, member : string | symbol, filters : AnnotationIdentifier<M>[] | AnnotationIdentifier<M> ) : Annotation<T, M>[] {
        if ( !( filters instanceof Array ) ) {
            return this.getAllForMember( target, member ).filter( ann => ann.is( filters ) );
        } else {
            return this.getAllForMember( target, member ).filter( ann => filters.some( filter => ann.is( filter ) ) );
        }
    }
	
	static schema<M> ( name : string | symbol, singleton : boolean = true, merger : boolean | AnnotationMerger<M> = false, identity : AnnotationIdentity<M> = null ) : AnnotationSchema<M> {
        return this.addSchema( new AnnotationSchema( name, singleton, merger, identity ) );
    }
}