import React, { Component } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { API, Need, KeyedCollection, Marker, CreateMarker, IKeyedCollection } from '../API/API'
import PageControl from 'react-native-page-control';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import MapView from 'react-native-maps';
import _ from 'lodash';

import { HavesView, MarkerType } from './HavesView';
import { OnboardingView } from './OnboardingView';
import { FiltersView } from './FiltersView'
import { NeedListView } from './NeedListView';
import { AboutView } from './AboutView';

interface Props {
  modalVisible: boolean
  modalType: string
  categories?: KeyedCollection<any>
  filters?: string[]
  onCancel(): void
  onSelectFilters?([]): void
}

interface State { }

export class ModalView extends Component<Props, State> {
  render() {
    if (!this.props.modalVisible) {
      return null
    }

    let modalContent

    switch (this.props.modalType.toUpperCase()) {
      case 'NEED':
        modalContent = <NeedListView cancelTapped={this.props.onCancel} />
        break
      case 'ABOUT':
        modalContent = <AboutView cancelTapped={this.props.onCancel} />
        break
      case 'ONBOARD':
        modalContent = <OnboardingView cancelTapped={this.props.onCancel} />
        break
      case 'HAVE':
        modalContent = <HavesView cancelTapped={this.props.onCancel}
          markerType={MarkerType.Have} />
        break
      case 'FILTER':
        modalContent = <FiltersView
          onCancel={this.props.onCancel}
          onSelectFilters={this.props.onSelectFilters}
          categories={this.props.categories}
          filters={this.props.filters}
        />
        break
      default:
        break
    }

    return (
      <Modal visible={this.props.modalVisible} animationType={'slide'} onRequestClose={this.props.onCancel}>
        {modalContent}
      </Modal>
    )
  }
}