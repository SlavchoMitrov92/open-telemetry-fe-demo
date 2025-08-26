import { useState, useEffect } from "react";
import { provider } from "./providers/otel";

export default function Demo() {

    interface Pokemon {
        id: number;
        name: string;
        height: number;
        weight: number;
        sprites: {
            front_default: string;
        },
        abilities: {
            ability: {
                name: string;
                url: string;
            };
            is_hidden: boolean;
            slot: number;
        }[],
        species: {
            name: string;
            url: string;
        };
    }

    useEffect(() => {
        const tracer = provider.getTracer('pokemon-app');
        const span = tracer.startSpan('component.mount');
        span.setAttribute('component.name', 'Demo');
        span.addEvent('component.mounted');
        span.end();
      }, []);

    const [pokemon, setPokemon] = useState<Pokemon | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [species, setSpecies] = useState<any>(null);
    const [evolutionChain, setEvolutionChain] = useState<any>(null);
    const [loadingEvolution, setLoadingEvolution] = useState(false);


    const [clickCount, setClickCount] = useState(0);

    function handleSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
        setSearchTerm(event.target.value);
    }


    function throwError() {
        throw new Error("This is a test error for OpenTelemetry!");
    }   


    const fetchPokemon = async () => {
        setLoading(true);
        setError('');
        setPokemon(null);
        const tracer = provider.getTracer('pokemon-app');
        const span = tracer.startSpan('fetchPokemon');
        span.setAttribute('searchTerm', searchTerm);
        span.setAttribute('service.name', 'pokemon-app');
        span.setAttribute('service.version', '1.0.0');
        try {
            const response = await fetch('https://pokeapi.co/api/v2/pokemon/' + searchTerm.toLowerCase());
            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                const errorText = await response.text();
                try {
                    const errorBody = JSON.parse(errorText);
                    errorMsg += `, message: ${errorBody?.message || JSON.stringify(errorBody)}`;
                } catch {
                    errorMsg += `, message: ${errorText}`;
                }
                span.setAttribute('error', true);
                span.setAttribute('error.code', `${response.status}`);
                span.setAttribute('error.message', errorMsg);

                span.end();
                setLoading(false);
                setError("Failed to fetch Pokémon data: " + errorMsg);
                throw new Error(errorMsg);
            }
            const data: Pokemon = await response.json();
            setPokemon(data);
            setLoading(false);
            setError("");
            span.setAttribute('pokemon.name', data.name);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLoading(false);
            span.setAttribute('error', true);
            span.setAttribute('error.message', err instanceof Error ? err.message : String(err));
            span.addEvent('exception', {
                'exception.type': err instanceof Error ? err.name : typeof err,
                'exception.message': err instanceof Error ? err.message : String(err),
                'exception.stacktrace': err instanceof Error ? err.stack : '',
            });
            // setError("");
            console.error(err);
        } finally {
            span.end();
        }
    };

    const handleEvolutionClick = () => {
        const tracer = provider.getTracer('pokemon-app');
        const span = tracer.startSpan('user-interaction');
        
        span.addEvent('button.click', {
            'click.count': clickCount + 1,
            'button.type': 'evolution-chain'
        });
        
        span.end();
        
        setClickCount(prev => prev + 1);
        fetchEvolutionChain();
    };


    const fetchEvolutionChain = async () => {
        if (!pokemon) return;

        setLoadingEvolution(true);
        const tracer = provider.getTracer('pokemon-app');
        const span = tracer.startSpan('fetchEvolutionChain');
        span.setAttribute('pokemon.name', pokemon.name);
        
        try {
            // First get species data
            const speciesResponse = await fetch(pokemon.species.url);
            if (!speciesResponse.ok) throw new Error('Failed to fetch species');
            const speciesData = await speciesResponse.json();
            setSpecies(speciesData);
            
            // Then get evolution chain
            const evolutionResponse = await fetch(speciesData.evolution_chain.url);
            if (!evolutionResponse.ok) throw new Error('Failed to fetch evolution chain');
            const evolutionData = await evolutionResponse.json();
            setEvolutionChain(evolutionData);
            
            span.setAttribute('evolution.chain.id', evolutionData.id);
        } catch (err) {
            span.setAttribute('error', true);
            span.setAttribute('error.message', err instanceof Error ? err.message : 'Unknown error');
            console.error('Evolution fetch error:', err);
        } finally {
            setLoadingEvolution(false);
            span.end();
        }
    };


    const parseEvolutionChain = (chain: any): any[] => {
        const evolutions = [];
        let current = chain;
        
        while (current) {
            evolutions.push({
                name: current.species.name,
                minLevel: current.evolution_details[0]?.min_level || null,
                trigger: current.evolution_details[0]?.trigger?.name || null,
            });
            current = current.evolves_to[0]; // Take first evolution path
        }
        
        return evolutions;
    };


    

    return (
        <div className="tutorial">
            <div className="pokemon-section">
                <input type="text" placeholder="Search for a Pokémon..." onChange={handleSearchChange} />
                <button
                    className="tutorial__button fetch-button"
                    // onClick={fetchPokemon}
                    onClick={() => {
                        fetchPokemon();
                    }}
                    id="fetch-pokemon-button"
                >
                    Fetch Pokemon
                </button>

                {loading && <p>Loading...</p>}
                {error && <p>Error: {error}</p>}
                {pokemon && (
                    <div className="pokemon-card">
                        <h3>{pokemon.name.toUpperCase()}</h3>
                        <p>ID: {pokemon.id}</p>
                        <p>Height: {pokemon.height / 10}m</p>
                        <p>Weight: {pokemon.weight / 10}kg</p>

                        <div className="abilities">
                            <h4>Abilities:</h4>
                            <ul>
                                {pokemon.abilities.map((abilityInfo, index) => (
                                    <li key={index}>
                                        {abilityInfo.ability.name.replace('-', ' ')}
                                        {abilityInfo.is_hidden && ' (Hidden)'}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {pokemon.sprites.front_default && (
                            <img
                                src={pokemon.sprites.front_default}
                                alt={pokemon.name}
                            />
                        )}

<button 
    onClick={handleEvolutionClick}
    disabled={loadingEvolution}
    className="evolution-btn"
>
    {loadingEvolution ? 'Loading Evolution...' : 'Get Evolution Chain'}
</button>

{evolutionChain && (
    <div className="evolution-chain">
        <h4>Evolution Chain:</h4>
        <div className="evolution-stages">
            {parseEvolutionChain(evolutionChain.chain).map((stage, index) => (
                <div key={index} className="evolution-stage">
                    <div className="pokemon-name">
                        {stage.name.charAt(0).toUpperCase() + stage.name.slice(1)}
                    </div>
                    {stage.minLevel && (
                        <div className="evolution-requirement">
                            Level {stage.minLevel}
                        </div>
                    )}
                    {stage.trigger && stage.trigger !== 'level-up' && (
                        <div className="evolution-trigger">
                            Trigger: {stage.trigger}
                        </div>
                    )}
                    {index < parseEvolutionChain(evolutionChain.chain).length - 1 && (
                        <div className="evolution-arrow">→</div>
                    )}
                </div>
            ))}
        </div>
    </div>
)}
                    </div>
                )}
            </div>
        </div>
    );
}