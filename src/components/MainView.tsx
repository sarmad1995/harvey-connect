import React, { Component } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { API, Need, KeyedCollection, Marker, CreateMarker, IKeyedCollection } from '../API/API'
import { CalloutView } from './CalloutView'
import PageControl from 'react-native-page-control';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import MapView from 'react-native-maps';
import { ModalView } from './ModalView';

const DEFAULT_VP_DELTA = {
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
}

const INITIAL_REGION = {
    latitude: 29.7630556,
    longitude: -95.3630556,
    ...DEFAULT_VP_DELTA
}

interface Props {
}

interface State {
    needs: Need[]
    categories: KeyedCollection<any>
    currentPage: number
    filters: Set<string>,
    selectedNeedId: string | null,
    modalVisible: boolean,
    currentPosition: Position | null,
    modalType: string
}

export class MainView extends Component<Props, State> {
    private watchId: number;

    constructor(props) {
        super(props);
        this.state = {
            needs: [],
            categories: new KeyedCollection,
            currentPage: 0,
            filters: new Set<string>(),
            selectedNeedId: null,
            modalVisible: false,
            currentPosition: null,
            modalType: ''
        };
    }

    componentDidMount() {
        this.watchId = navigator.geolocation.watchPosition((pos) => this.setState({ currentPosition: pos }) , (err) => {}, { enableHighAccuracy: true })
        this.getNeeds();
        this.getCategories();
    }

    componentWillUnmount() {
        navigator.geolocation.clearWatch(this.watchId);
    }

    getCategories = async () => {
        let categories = await API.getCategories()
        if (categories !== undefined || categories !== null) {
            this.setState({ categories: categories })
        }
    }

    getNeeds = async () => {
        let needs = await API.getNeeds();
        if (needs !== undefined || needs !== null) {
            needs = needs.filter(need => need.latitude && need.longitude)
            if (this.state.currentPosition) {
                let {latitude, longitude} = this.state.currentPosition.coords;
                needs = needs.sort((lhs, rhs) => {
                    let lhsDistance = lhs.distanceToCoordinate({latitude, longitude});
                    let rhsDistance = rhs.distanceToCoordinate({latitude, longitude});
                    return lhsDistance - rhsDistance;
                });
            }
            this.setState({ needs: needs })
        }
    }

    keyExtractor = (_: string, index: number): string => {
        return `${index}`
    };

    onScrollEnd = (e) => {
        let contentOffset = e.nativeEvent.contentOffset;
        let viewSize = e.nativeEvent.layoutMeasurement;

        let pageNum = Math.floor(contentOffset.x / viewSize.width);
        this.setState({ currentPage: pageNum })
    };

    getFilteredNeeds = () => {
        if (this.state.filters.size === 0) {
            return this.state.needs;
        }

        return this.state.needs.filter(need => this.state.filters.has(need.category));
//        return filteredNeeds.filter(need => this.state.filters.includes(_.capitalize(need.category)));
    }

    renderNeeds = () => {
        return this.getFilteredNeeds().map(marker => {
            return (
                <MapView.Marker
                    pinColor={marker.markerType === 'need' ? 'red' : 'blue'}
                    coordinate={{
                        latitude: marker.latitude,
                        longitude: marker.longitude
                    }}
                    identifier={`${marker.id}`}
                    onPress={this.onPressNeedMarker}
                    title={marker.category}
                    description={marker.description}
                    key={marker.id}
                />
            )

        })
    }

    renderNeedCardView = () => {
        if (!this.state.selectedNeedId) {
            return
        }

        // Based on the selected need, render the list view
        const needs = this.getFilteredNeeds()
        const selectedNeedIndex = needs.findIndex(need => {
            return +need.id === +this.state.selectedNeedId
        });

        return (
            <View style={styles.cardWrapper}>
                <FlatList
                    ref='cardViewList'
                    data={needs}
                    extraData={{
                        selectedNeedId: this.state.selectedNeedId
                    }}
                    getItemLayout={(data, index) => {
                        const { width } = Dimensions.get('window');
                        return {
                            offset: width * index,
                            length: width,
                            index
                        }
                    }}
                    renderItem={this.renderItem}
                    keyExtractor={this.keyExtractor}
                    horizontal
                    pagingEnabled
                    onMomentumScrollEnd={this.onScrollEnd}
                    showsHorizontalScrollIndicator={false}
                />
            </View>
        )
    }

    renderItem = ({ item, index }: { item: Need, index: number }) => {
        let { width, height } = Dimensions.get('window');
        // console.log(`width ${width}, height: ${height}`);

        return (
            <View style={StyleSheet.flatten([styles.cardItem, { width: width - 20 }])}>
                <CalloutView need={item} />
            </View >
        )
    };

    onPressActionButtonFilter = () => {
        this.setState({
            modalVisible: true,
            modalType: 'FILTER'
        })
    }

    onPressActionButtonNeed = () => {
        this.setState({ 
            modalVisible: true,
            modalType: 'NEED'
         })
    }
    
    dismissModal () {
        this.setState({
            modalVisible: false,
            modalType: ''
        })
    }

    onPressNeedMarker = (e) => {
        const { id, coordinate } = e.nativeEvent;

        this.setState({ selectedNeedId: id }, () => {
            (this.refs.mainMap as MapView).animateToCoordinate(coordinate, 300);

            const needs = this.getFilteredNeeds()
            let selectedNeedIndex = needs.findIndex(need => {
                return +need.id === +this.state.selectedNeedId
            });
            this.refs.cardViewList.scrollToIndex({
                index: selectedNeedIndex,
                animated: true,
            })
        });
    }

    onSelectFilters (filters) {
        this.setState({ 
            filters,
            modalVisible: false,
            modalType: ''
         }) 
    }

    render () {
        const { height } = Dimensions.get('window');

        return (
            <View style={{ flex: 1 }}>
                <ModalView
                    modalVisible={this.state.modalVisible}
                    modalType={this.state.modalType}
                    onCancel={this.dismissModal.bind(this)}
                    onSelectFilters={this.onSelectFilters.bind(this)}
                    categories={this.state.categories}
                    filters={this.state.filters} />

                <MapView ref='mainMap'
                    style={{ flex: 1 }}
                    initialRegion={INITIAL_REGION}
                    showsUserLocation={true}
                >
                    {this.renderNeeds()}
                </MapView>

                <View style={styles.cardSheet}>
                    <View style={styles.actionButtonContainer}>
                        <TouchableOpacity activeOpacity={0.9} onPress={this.onPressActionButtonFilter.bind(this)} style={StyleSheet.flatten([styles.actionButton, styles.actionButtonFilter])}>
                            <FAIcon name="filter" size={15} style={styles.actionButtonIcon} />
                            <Text style={styles.actionButtonText}> FILTER </Text>
                        </TouchableOpacity>

                        <TouchableOpacity activeOpacity={0.9} onPress={this.onPressActionButtonNeed.bind(this)} style={StyleSheet.flatten([styles.actionButton, styles.actionButtonNeed])}>
                            <EntypoIcon name="edit" size={15} style={styles.actionButtonIcon} />
                            <Text style={styles.actionButtonText}>NEED</Text>
                        </TouchableOpacity>
                    </View>

                    {this.renderNeedCardView()}
                </View>
            </View>
        )
    }
}

const styles = StyleSheet.create({
    cardSheet: {
        left: 0,
        right: 0,
        bottom: 10,
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'absolute'
    },
    cardWrapper: {
        flex: 1,
        height: 225,
    },
    cardItem: {
        flex: 1,
        marginRight: 10,
        marginLeft: 10,
        borderRadius: 6,
        backgroundColor: "#fff",
    },
    actionButtonContainer: {
        height: 44,
        flexDirection: 'row',
        alignContent: 'space-around',
        justifyContent: 'space-between',
        marginTop: 10,
        marginLeft: 10,
        marginRight: 10
    },
    actionButton: {
        height: 40,
        flex: 1,
        backgroundColor: 'green',
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 50,
        marginRight: 20,
        marginLeft: 20,
    },
    actionButtonIcon: {
        color: "#FFF",
        marginRight: 5
    },
    actionButtonFilter: {
        backgroundColor: '#FF5A5F',
    },
    actionButtonNeed: {
        backgroundColor: '#0080FE',
    },
    actionButtonText: {
        color: 'white'
    },
    pageControl: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 15
    },
    pageControlIndicator: {
        borderRadius: 5
    }
});
